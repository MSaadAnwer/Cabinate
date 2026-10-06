package com.cabinate.api.recipe;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import com.cabinate.api.common.pagination.PageResponse;
import org.springframework.stereotype.Service;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.recipe.dto.CreateRecipeRequest;
import com.cabinate.api.recipe.dto.RecipeResponse;
import com.cabinate.api.recipe.dto.UpdateRecipeRequest;
import lombok.RequiredArgsConstructor;
import com.cabinate.api.common.security.AccountContext;
import com.cabinate.api.common.persistence.WriteVersion;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final AccountContext account;

    public RecipeResponse createRecipe(CreateRecipeRequest request) {
        Instant now = Instant.now();
        Recipe recipe = Recipe.builder()
                .ownerId(account.id())
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
        return recipeRepository.findByIdAndOwnerId(id, account.id())
                .map(RecipeResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", "id", id));
    }

    public List<RecipeResponse> getAllRecipes(String search) {
        return getRecipePage(search, Pageable.unpaged()).items();
    }

    public RecipeResponse updateRecipe(String id, UpdateRecipeRequest request) {
        Recipe existing = recipeRepository.findByIdAndOwnerId(id, account.id())
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", "id", id));

        WriteVersion.check(request.version(), existing.getVersion());
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

    public PageResponse<RecipeResponse> getRecipePage(String search, Pageable pageable) {
        var page = search != null && !search.isBlank()
                ? recipeRepository.findByOwnerIdAndTitleContainingIgnoreCase(account.id(), search.trim(), pageable)
                : recipeRepository.findByOwnerId(account.id(), pageable);
        return PageResponse.from(page.map(RecipeResponse::fromEntity));
    }

    public void deleteRecipe(String id, long version) {
        Recipe existing = recipeRepository.findByIdAndOwnerId(id, account.id())
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", "id", id));
        WriteVersion.check(version, existing.getVersion());
        recipeRepository.delete(existing);
    }
}
