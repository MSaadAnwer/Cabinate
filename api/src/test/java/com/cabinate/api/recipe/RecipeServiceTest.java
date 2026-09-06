package com.cabinate.api.recipe;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.recipe.dto.CreateRecipeRequest;
import com.cabinate.api.recipe.dto.RecipeResponse;
import com.cabinate.api.recipe.dto.UpdateRecipeRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

    @InjectMocks
    private RecipeService recipeService;

    private Recipe sampleRecipe;

    @BeforeEach
    void setUp() {
        sampleRecipe = Recipe.builder()
                .id("rec-123")
                .title("Avocado Toast")
                .description("Crispy toast with fresh avocado")
                .sourceUrl("https://example.com/avocado-toast")
                .rawText("Toast sourdough. Mash avocado with salt and pepper. Spread on toast.")
                .prepTimeMinutes(5)
                .cookTimeMinutes(5)
                .servings(1)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void createRecipe_ShouldPersistAndReturnRecipeResponse() {
        CreateRecipeRequest request = new CreateRecipeRequest(
                "Avocado Toast",
                "Crispy toast with fresh avocado",
                "https://example.com/avocado-toast",
                "Toast sourdough. Mash avocado with salt and pepper. Spread on toast.",
                5,
                5,
                1);

        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> {
            Recipe saved = invocation.getArgument(0);
            saved.setId("rec-123");
            return saved;
        });

        RecipeResponse response = recipeService.createRecipe(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo("rec-123");
        assertThat(response.title()).isEqualTo("Avocado Toast");
        assertThat(response.createdAt()).isNotNull();
        assertThat(response.updatedAt()).isNotNull();

        ArgumentCaptor<Recipe> captor = ArgumentCaptor.forClass(Recipe.class);
        verify(recipeRepository).save(captor.capture());
        Recipe captured = captor.getValue();
        assertThat(captured.getTitle()).isEqualTo("Avocado Toast");
        assertThat(captured.getRawText()).isEqualTo(request.rawText());
    }

    @Test
    void getRecipeById_WhenFound_ShouldReturnRecipeResponse() {
        when(recipeRepository.findById("rec-123")).thenReturn(Optional.of(sampleRecipe));

        RecipeResponse response = recipeService.getRecipeById("rec-123");

        assertThat(response.id()).isEqualTo("rec-123");
        assertThat(response.title()).isEqualTo("Avocado Toast");
    }

    @Test
    void getRecipeById_WhenNotFound_ShouldThrowResourceNotFoundException() {
        when(recipeRepository.findById("rec-unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> recipeService.getRecipeById("rec-unknown"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Recipe not found with id: 'rec-unknown'");
    }

    @Test
    void getAllRecipes_WithoutSearch_ShouldReturnAll() {
        when(recipeRepository.findAll()).thenReturn(List.of(sampleRecipe));

        List<RecipeResponse> result = recipeService.getAllRecipes(null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo("rec-123");
        verify(recipeRepository).findAll();
        verify(recipeRepository, never()).findByTitleContainingIgnoreCase(any());
    }

    @Test
    void getAllRecipes_WithSearch_ShouldQueryRepository() {
        when(recipeRepository.findByTitleContainingIgnoreCase("avocado")).thenReturn(List.of(sampleRecipe));

        List<RecipeResponse> result = recipeService.getAllRecipes("avocado");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).title()).isEqualTo("Avocado Toast");
        verify(recipeRepository).findByTitleContainingIgnoreCase("avocado");
        verify(recipeRepository, never()).findAll();
    }

    @Test
    void updateRecipe_WhenFound_ShouldUpdateAndReturnResponse() {
        UpdateRecipeRequest updateReq = new UpdateRecipeRequest(
                "Super Avocado Toast",
                "Updated description",
                "https://example.com/new-toast",
                "Updated raw instructions",
                10,
                5,
                2);

        when(recipeRepository.findById("rec-123")).thenReturn(Optional.of(sampleRecipe));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecipeResponse response = recipeService.updateRecipe("rec-123", updateReq);

        assertThat(response.title()).isEqualTo("Super Avocado Toast");
        assertThat(response.description()).isEqualTo("Updated description");
        assertThat(response.prepTimeMinutes()).isEqualTo(10);
        assertThat(response.servings()).isEqualTo(2);
        verify(recipeRepository).save(sampleRecipe);
    }

    @Test
    void updateRecipe_WhenNotFound_ShouldThrowException() {
        UpdateRecipeRequest updateReq = new UpdateRecipeRequest(
                "Super Toast", null, null, "Raw instructions", null, null, 1);

        when(recipeRepository.findById("rec-unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> recipeService.updateRecipe("rec-unknown", updateReq))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(recipeRepository, never()).save(any());
    }

    @Test
    void deleteRecipe_WhenExists_ShouldDelete() {
        when(recipeRepository.existsById("rec-123")).thenReturn(true);

        recipeService.deleteRecipe("rec-123");

        verify(recipeRepository).deleteById("rec-123");
    }

    @Test
    void deleteRecipe_WhenNotExists_ShouldThrowException() {
        when(recipeRepository.existsById("rec-unknown")).thenReturn(false);

        assertThatThrownBy(() -> recipeService.deleteRecipe("rec-unknown"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(recipeRepository, never()).deleteById(any());
    }
}
