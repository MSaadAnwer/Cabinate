package com.cabinate.api.recipe.dto;

import java.util.List;

public record GeneratedRecipeResponse(String title, String description, List<String> ingredients,
        List<String> steps, int prepTimeMinutes, int cookTimeMinutes, int servings) {}
