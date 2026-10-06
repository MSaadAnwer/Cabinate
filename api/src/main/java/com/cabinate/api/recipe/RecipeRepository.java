package com.cabinate.api.recipe;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RecipeRepository extends MongoRepository<Recipe, String> {
    Page<Recipe> findByOwnerId(String ownerId, Pageable pageable);
    Optional<Recipe> findByIdAndOwnerId(String id, String ownerId);
    Page<Recipe> findByOwnerIdAndTitleContainingIgnoreCase(String ownerId, String title, Pageable pageable);
    long countByOwnerId(String ownerId);
    void deleteByOwnerId(String ownerId);
}
