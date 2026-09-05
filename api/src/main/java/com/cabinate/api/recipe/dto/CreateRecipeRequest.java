package com.cabinate.api.recipe.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRecipeRequest(
        @NotBlank(message = "Title is required") @Size(max = 120, message = "Title cannot exceed 120 characters") String title,

        String description,
        String sourceUrl,

        @NotBlank(message = "Raw recipe text is required for ingestion") String rawText,

        @Min(value = 0, message = "Prep time cannot be negative") Integer prepTimeMinutes,

        @Min(value = 0, message = "Cook time cannot be negative") Integer cookTimeMinutes,

        @Min(value = 1, message = "Servings must be at least 1") Integer servings) {
}
