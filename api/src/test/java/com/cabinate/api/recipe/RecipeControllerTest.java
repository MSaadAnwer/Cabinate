package com.cabinate.api.recipe;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import com.cabinate.api.common.exception.GlobalExceptionHandler;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.recipe.dto.CreateRecipeRequest;
import com.cabinate.api.recipe.dto.RecipeResponse;
import com.cabinate.api.recipe.dto.UpdateRecipeRequest;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RecipeControllerTest {

    private MockMvc mockMvc;

    @Mock
    private RecipeService recipeService;

    @InjectMocks
    private RecipeController recipeController;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(recipeController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void createRecipe_WhenValid_ShouldReturn201Created() throws Exception {
        RecipeResponse response = new RecipeResponse(
                "rec-456",
                "Berry Smoothie",
                "Healthy protein smoothie",
                "https://example.com/smoothie",
                "Blend berries, yogurt, and milk.",
                5,
                0,
                1,
                Instant.now(),
                Instant.now());

        when(recipeService.createRecipe(any(CreateRecipeRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "title": "Berry Smoothie",
                    "description": "Healthy protein smoothie",
                    "sourceUrl": "https://example.com/smoothie",
                    "rawText": "Blend berries, yogurt, and milk.",
                    "prepTimeMinutes": 5,
                    "cookTimeMinutes": 0,
                    "servings": 1
                }
                """;

        mockMvc.perform(post("/api/v1/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("rec-456"))
                .andExpect(jsonPath("$.title").value("Berry Smoothie"))
                .andExpect(jsonPath("$.servings").value(1));
    }

    @Test
    void createRecipe_WhenInvalid_ShouldReturn400BadRequest() throws Exception {
        String invalidPayload = """
                {
                    "title": "",
                    "rawText": "",
                    "prepTimeMinutes": -1,
                    "servings": 0
                }
                """;

        mockMvc.perform(post("/api/v1/recipes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").exists())
                .andExpect(jsonPath("$.fieldErrors.rawText").exists())
                .andExpect(jsonPath("$.fieldErrors.prepTimeMinutes").exists())
                .andExpect(jsonPath("$.fieldErrors.servings").exists());
    }

    @Test
    void getAllRecipes_ShouldReturnList() throws Exception {
        RecipeResponse item = new RecipeResponse(
                "rec-1", "Pancakes", null, null, "Make batter and cook.", 10, 15, 4, Instant.now(), Instant.now());
        when(recipeService.getAllRecipes(null)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/v1/recipes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("rec-1"))
                .andExpect(jsonPath("$[0].title").value("Pancakes"));
    }

    @Test
    void getRecipeById_WhenFound_ShouldReturn200() throws Exception {
        RecipeResponse item = new RecipeResponse(
                "rec-1", "Pancakes", null, null, "Make batter and cook.", 10, 15, 4, Instant.now(), Instant.now());
        when(recipeService.getRecipeById("rec-1")).thenReturn(item);

        mockMvc.perform(get("/api/v1/recipes/rec-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("rec-1"))
                .andExpect(jsonPath("$.title").value("Pancakes"));
    }

    @Test
    void getRecipeById_WhenNotFound_ShouldReturn404() throws Exception {
        when(recipeService.getRecipeById("rec-missing"))
                .thenThrow(new ResourceNotFoundException("Recipe", "id", "rec-missing"));

        mockMvc.perform(get("/api/v1/recipes/rec-missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Recipe not found with id: 'rec-missing'"));
    }

    @Test
    void updateRecipe_WhenValid_ShouldReturn200() throws Exception {
        RecipeResponse response = new RecipeResponse(
                "rec-1", "Fluffy Pancakes", "Updated", null, "Updated raw text", 12, 18, 4, Instant.now(), Instant.now());

        when(recipeService.updateRecipe(eq("rec-1"), any(UpdateRecipeRequest.class))).thenReturn(response);

        String updatePayload = """
                {
                    "title": "Fluffy Pancakes",
                    "description": "Updated",
                    "rawText": "Updated raw text",
                    "prepTimeMinutes": 12,
                    "cookTimeMinutes": 18,
                    "servings": 4
                }
                """;

        mockMvc.perform(put("/api/v1/recipes/rec-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Fluffy Pancakes"))
                .andExpect(jsonPath("$.prepTimeMinutes").value(12));
    }

    @Test
    void deleteRecipe_WhenFound_ShouldReturn204NoContent() throws Exception {
        doNothing().when(recipeService).deleteRecipe("rec-1");

        mockMvc.perform(delete("/api/v1/recipes/rec-1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteRecipe_WhenNotFound_ShouldReturn404() throws Exception {
        doThrow(new ResourceNotFoundException("Recipe", "id", "rec-missing"))
                .when(recipeService).deleteRecipe("rec-missing");

        mockMvc.perform(delete("/api/v1/recipes/rec-missing"))
                .andExpect(status().isNotFound());
    }
}
