package com.cabinate.api.recipe;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

class BedrockRecipeIdeaProviderTest {
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test void sendsPantryAndExclusionsAndParsesToolResponse() {
        var provider = new BedrockRecipeIdeaProvider(mapper, "test-token", "us-east-1", "amazon.nova-micro-v1:0", (uri, token, body) -> {
            assertEquals("https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.nova-micro-v1%3A0/converse", uri.toString());
            assertEquals("test-token", token);
            var request = mapper.readTree(body);
            assertEquals(0.4, request.path("inferenceConfig").path("temperature").asDouble());
            var schema = request.path("toolConfig").path("tools").get(0).path("toolSpec").path("inputSchema").path("json");
            assertEquals(3, schema.size());
            assertEquals("object", schema.path("type").asText());
            assertTrue(schema.has("properties"));
            assertTrue(schema.has("required"));
            assertFalse(schema.has("additionalProperties"));
            assertTrue(request.path("toolConfig").path("toolChoice").has("auto"));
            var prompt = request.path("messages").get(0).path("content").get(0).path("text").asText();
            var data = mapper.readTree(prompt.substring(prompt.indexOf('\n') + 1));
            assertEquals("Omelette", data.path("excludeTitles").get(0).asText());
            assertEquals("item1", data.path("pantry").get(0).path("id").asText());
            var response = Map.of("stopReason", "tool_use", "output", Map.of("message", Map.of("content", List.of(
                    Map.of("text", "<thinking>Choose three pantry dishes.</thinking>"),
                    Map.of("toolUse", Map.of("name", "suggest_recipes", "input", Map.of("recipes", List.of(
                            RecipeGenerationServiceTest.idea("Scrambled eggs", "item1", 2),
                            RecipeGenerationServiceTest.idea("Poached eggs", "item1", 2),
                            RecipeGenerationServiceTest.idea("Boiled eggs", "item1", 2)))))))));
            return new BedrockRecipeIdeaProvider.Reply(200, mapper.writeValueAsString(response));
        });
        var ideas = provider.generate(List.of(new RecipeIdeaProvider.Stock("egg", "Eggs", 6, "pcs", "")), List.of("Omelette"));
        assertEquals(3, ideas.size());
        assertEquals("egg", ideas.getFirst().ingredients().getFirst().pantryItemId());
    }

    @Test void collectsPartialResponsesAndExcludesAlreadyCollectedTitles() {
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        var provider = new BedrockRecipeIdeaProvider(mapper, "test-token", "us-east-1", "test", (u, t, b) -> {
            int index = calls.getAndIncrement();
            var request = mapper.readTree(b);
            var prompt = request.path("messages").get(0).path("content").get(0).path("text").asText();
            var data = mapper.readTree(prompt.substring(prompt.indexOf('\n') + 1));
            assertEquals(index, data.path("excludeTitles").size());
            var response = Map.of("stopReason", "tool_use", "output", Map.of("message", Map.of("content", List.of(
                    Map.of("toolUse", Map.of("name", "suggest_recipes", "input", Map.of("recipes",
                            List.of(RecipeGenerationServiceTest.ideas().get(index)))))))));
            return new BedrockRecipeIdeaProvider.Reply(200, mapper.writeValueAsString(response));
        });
        assertEquals(3, provider.generate(List.of(new RecipeIdeaProvider.Stock("egg", "Eggs", 6, "pcs", "")), List.of()).size());
        assertEquals(3, calls.get());
    }

    @Test void discardsUnavailableStaplesAndRequestsReplacement() {
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        var provider = new BedrockRecipeIdeaProvider(mapper, "test-token", "us-east-1", "test", (u, t, b) -> {
            var batch = calls.getAndIncrement() == 0
                    ? List.of(RecipeGenerationServiceTest.idea("Cheese omelette", "item1", 2),
                            RecipeGenerationServiceTest.idea("Poached eggs", "item1", 2),
                            RecipeGenerationServiceTest.idea("Boiled eggs", "item1", 2))
                    : List.of(RecipeGenerationServiceTest.idea("Scrambled eggs", "item1", 2));
            var response = Map.of("stopReason", "tool_use", "output", Map.of("message", Map.of("content", List.of(
                    Map.of("toolUse", Map.of("name", "suggest_recipes", "input", Map.of("recipes", batch)))))));
            return new BedrockRecipeIdeaProvider.Reply(200, mapper.writeValueAsString(response));
        });
        var result = provider.generate(List.of(new RecipeIdeaProvider.Stock("egg", "Eggs", 6, "pcs", "")), List.of());
        assertEquals(3, result.size());
        assertEquals(2, calls.get());
        assertTrue(result.stream().noneMatch(idea -> idea.title().contains("Cheese")));
    }

    @Test void missingConfigurationNeverMakesRequest() {
        var provider = new BedrockRecipeIdeaProvider(mapper, "", "us-east-1", "test", (u, t, b) -> { fail("Network called"); return null; });
        assertEquals(RecipeGenerationException.Reason.UNAVAILABLE,
                assertThrows(RecipeGenerationException.class, () -> provider.generate(List.of(), List.of())).reason());
    }

    @Test void rejectsTruncatedRefusedMalformedAndProviderErrorsWithoutLeakingPayload() {
        for (var reply : List.of(new BedrockRecipeIdeaProvider.Reply(403, "secret upstream details"),
                new BedrockRecipeIdeaProvider.Reply(200, "not json"),
                new BedrockRecipeIdeaProvider.Reply(200, "{\"stopReason\":\"max_tokens\"}"),
                new BedrockRecipeIdeaProvider.Reply(200, "{\"stopReason\":\"end_turn\",\"output\":{}}"))) {
            var provider = new BedrockRecipeIdeaProvider(mapper, "test-token", "us-east-1", "test", (u, t, b) -> reply);
            var error = assertThrows(RecipeGenerationException.class, () -> provider.generate(List.of(), List.of()));
            assertFalse(error.getMessage().contains("secret"));
            assertFalse(error.getMessage().contains("test-token"));
        }
    }
}
