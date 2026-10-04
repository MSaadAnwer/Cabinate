package com.cabinate.api.recipe.dto;

import java.util.List;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GenerateRecipesRequest(
        @Size(max = 60) List<@NotBlank @Size(max = 120) String> excludeTitles) {
    public GenerateRecipesRequest {
        excludeTitles = excludeTitles == null ? List.of() : List.copyOf(excludeTitles);
    }
}
