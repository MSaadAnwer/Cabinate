package com.cabinate.api.recipe.dto;

import java.time.Instant;
import com.cabinate.api.recipe.Recipe;

public record RecipeResponse(
        String id,
        String title,
        String description,
        String sourceUrl,
        String rawText,
        Integer prepTimeMinutes,
        Integer cookTimeMinutes,
        Integer servings,
        Instant createdAt,
        Instant updatedAt) {

    public static RecipeResponse fromEntity(Recipe recipe) {
        if (recipe == null) {
            return null;
        }
        return new RecipeResponse(
                recipe.getId(),
                recipe.getTitle(),
                recipe.getDescription(),
                recipe.getSourceUrl(),
                recipe.getRawText(),
                recipe.getPrepTimeMinutes(),
                recipe.getCookTimeMinutes(),
                recipe.getServings(),
                recipe.getCreatedAt(),
                recipe.getUpdatedAt());
    }
}
