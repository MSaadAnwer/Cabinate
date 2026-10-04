package com.cabinate.api.recipe;

import java.util.List;

public interface RecipeIdeaProvider {
    record Ingredient(String pantryItemId, double quantity) {}
    record Idea(String title, String description, List<Ingredient> ingredients, List<String> steps,
            int prepTimeMinutes, int cookTimeMinutes, int servings) {}
    record Stock(String id, String name, double quantity, String unit, String expirationDate) {}

    List<Idea> generate(List<Stock> pantry, List<String> excludeTitles);
}
