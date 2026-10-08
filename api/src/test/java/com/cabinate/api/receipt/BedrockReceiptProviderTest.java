package com.cabinate.api.receipt;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static com.cabinate.api.receipt.ReceiptContracts.*;

class BedrockReceiptProviderTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final ReceiptProvider.Input image = new ReceiptProvider.Input("image-bytes", "jpeg", null, "hash");

    static ReceiptProvider.Extraction extraction() {
        return new ReceiptProvider.Extraction("Grocery", "2026-10-07", List.of(
                new ReceiptProvider.Line("RICE 12OZ 1.99", "Rice", 1.0, "pack", "GRAINS", "CABINET", Kind.FOOD, Confidence.HIGH),
                new ReceiptProvider.Line("ABC 2.49", "ABC", null, "pack", "OTHER", "CABINET", Kind.UNKNOWN, Confidence.LOW)));
    }

    private String response(ReceiptProvider.Extraction extraction) {
        return mapper.writeValueAsString(Map.of("stopReason", "tool_use", "output", Map.of("message", Map.of("content", List.of(
                Map.of("toolUse", Map.of("name", "extract_receipt", "input", extraction)))))));
    }

    @Test void sendsMultimodalConversePayloadWithNullableQuantityAndNoPantryTools() {
        var provider = new BedrockReceiptProvider(mapper, "secret", "us-east-1", "amazon.nova-lite-v1:0", (uri, token, body) -> {
            assertEquals("https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.nova-lite-v1%3A0/converse", uri.toString());
            assertEquals("secret", token);
            var request = mapper.readTree(body);
            assertEquals("user", request.path("messages").get(0).path("role").asText());
            var content = request.path("messages").get(0).path("content");
            assertEquals("jpeg", content.get(1).path("image").path("format").asText());
            assertEquals("image-bytes", content.get(1).path("image").path("source").path("bytes").asText());
            var tool = request.path("toolConfig").path("tools").get(0).path("toolSpec");
            assertEquals("extract_receipt", tool.path("name").asText());
            assertEquals(3, tool.path("inputSchema").path("json").size());
            assertTrue(request.path("system").get(0).path("text").asText().contains("NEVER use a price"));
            return new BedrockReceiptProvider.Reply(200, response(extraction()));
        });
        var parsed = provider.extract(image);
        assertEquals("Grocery", parsed.store());
        assertEquals(1.0, parsed.items().getFirst().quantity());
        assertNull(parsed.items().getLast().quantity());
    }

    @Test void textFallbackSendsNoImage() {
        var provider = new BedrockReceiptProvider(mapper, "secret", "us-east-1", "amazon.nova-lite-v1:0", (uri, token, body) -> {
            var content = mapper.readTree(body).path("messages").get(0).path("content");
            assertEquals(1, content.size());
            assertTrue(content.get(0).path("text").asText().endsWith("Rice 1 pack"));
            return new BedrockReceiptProvider.Reply(200, response(extraction()));
        });
        assertEquals(2, provider.extract(new ReceiptProvider.Input(null, null, "Rice 1 pack", "hash")).items().size());
    }

    @Test void refusesMissingTokenAndTextOnlyModelWithoutCallingNetwork() {
        for (String model : List.of("amazon.nova-micro-v1:0", "")) {
            var provider = new BedrockReceiptProvider(mapper, "secret", "us-east-1", model, (u, t, b) -> { fail("Network called"); return null; });
            assertEquals(503, assertThrows(ReceiptException.class, () -> provider.extract(image)).status().value());
        }
        var provider = new BedrockReceiptProvider(mapper, "", "us-east-1", "amazon.nova-lite-v1:0", (u, t, b) -> { fail("Network called"); return null; });
        assertEquals(503, assertThrows(ReceiptException.class, () -> provider.extract(image)).status().value());
    }

    @Test void refusesErrorsTruncationRefusalAndMalformedOutputWithoutLeakingProviderData() {
        for (var reply : List.of(new BedrockReceiptProvider.Reply(403, "secret provider payload"),
                new BedrockReceiptProvider.Reply(200, "not json: secret provider payload"),
                new BedrockReceiptProvider.Reply(200, "{\"stopReason\":\"max_tokens\"}"),
                new BedrockReceiptProvider.Reply(200, "{\"stopReason\":\"end_turn\"}"))) {
            var provider = new BedrockReceiptProvider(mapper, "secret", "us-east-1", "amazon.nova-lite-v1:0", (u, t, b) -> reply);
            var error = assertThrows(ReceiptException.class, () -> provider.extract(image));
            assertFalse(error.getMessage().contains("secret"));
        }
    }
}
