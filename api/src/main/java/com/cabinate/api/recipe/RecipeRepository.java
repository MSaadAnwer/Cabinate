package com.cabinate.api.recipe;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecipeRepository extends MongoRepository<Recipe, String> {

    // Derived query: Search recipes by title (case-insensitive)
    List<Recipe> findByTitleContainingIgnoreCase(String title);
}
