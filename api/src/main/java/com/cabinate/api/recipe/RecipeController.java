package com.cabinate.api.recipe;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestHeader;
import com.cabinate.api.common.persistence.WriteVersion;
import com.cabinate.api.common.pagination.PageQuery;
import com.cabinate.api.common.pagination.PageResponse;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.cabinate.api.recipe.dto.CreateRecipeRequest;
import com.cabinate.api.recipe.dto.RecipeResponse;
import com.cabinate.api.recipe.dto.UpdateRecipeRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;
    private final RecipeGenerationService generationService;

    @PostMapping("/generate")
    public List<com.cabinate.api.recipe.dto.GeneratedRecipeResponse> generateRecipes(
            @Valid @RequestBody com.cabinate.api.recipe.dto.GenerateRecipesRequest request) {
        return generationService.generate(request.excludeTitles());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecipeResponse createRecipe(@Valid @RequestBody CreateRecipeRequest request) {
        return recipeService.createRecipe(request);
    }

    @GetMapping
    public List<RecipeResponse> getAllRecipes(@RequestParam(required = false) String search) {
        return recipeService.getAllRecipes(search);
    }

    @GetMapping("/{id}")
    public RecipeResponse getRecipeById(@PathVariable String id) {
        return recipeService.getRecipeById(id);
    }

    @GetMapping("/page")
    public PageResponse<RecipeResponse> getRecipePage(@RequestParam(required = false) String search,
            @Valid @ModelAttribute PageQuery query) {
        return recipeService.getRecipePage(search, query.sortedBy(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PutMapping("/{id}")
    public RecipeResponse updateRecipe(
            @PathVariable String id,
            @Valid @RequestBody UpdateRecipeRequest request) {
        return recipeService.updateRecipe(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecipe(@PathVariable String id, @RequestHeader(value = "If-Match", required = false) String version) {
        recipeService.deleteRecipe(id, WriteVersion.parse(version));
    }
}
