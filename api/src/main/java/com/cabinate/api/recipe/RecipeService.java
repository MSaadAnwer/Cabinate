package com.cabinate.api.recipe;

import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.recipe.dto.CreateRecipeRequest;
import com.cabinate.api.recipe.dto.RecipeResponse;
import com.cabinate.api.recipe.dto.UpdateRecipeRequest;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;

    public RecipeResponse createRecipe(CreateRecipeRequest request) {
        Instant now = Instant.now();
        Recipe recipe = Recipe.builder()
                .title(request.title())
                .description(request.description())
                .sourceUrl(request.sourceUrl())
                .rawText(request.rawText())
                .prepTimeMinutes(request.prepTimeMinutes())
                .cookTimeMinutes(request.cookTimeMinutes())
                .servings(request.servings())
                .createdAt(now)
                .updatedAt(now)
                .build();

        Recipe saved = recipeRepository.save(recipe);
        return RecipeResponse.fromEntity(saved);
    }

    public RecipeResponse getRecipeById(String id) {
        return recipeRepository.findById(id)
                .map(RecipeResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", "id", id));
    }

    public List<RecipeResponse> getAllRecipes(String search) {
        List<Recipe> recipes;
        if (search != null && !search.isBlank()) {
            recipes = recipeRepository.findByTitleContainingIgnoreCase(search.trim());
        } else {
            recipes = recipeRepository.findAll();
        }

        return recipes.stream()
                .map(RecipeResponse::fromEntity)
                .toList();
    }

    public RecipeResponse updateRecipe(String id, UpdateRecipeRequest request) {
        Recipe existing = recipeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", "id", id));

        existing.setTitle(request.title());
        existing.setDescription(request.description());
        existing.setSourceUrl(request.sourceUrl());
        existing.setRawText(request.rawText());
        existing.setPrepTimeMinutes(request.prepTimeMinutes());
        existing.setCookTimeMinutes(request.cookTimeMinutes());
        existing.setServings(request.servings());
        existing.setUpdatedAt(Instant.now());

        Recipe saved = recipeRepository.save(existing);
        return RecipeResponse.fromEntity(saved);
    }

    public void deleteRecipe(String id) {
        if (!recipeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Recipe", "id", id);
        }
        recipeRepository.deleteById(id);
    }
}
