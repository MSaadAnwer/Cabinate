package com.cabinate.api.recipe;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Document(collection = "recipes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Recipe {

    @Id
    private String id;

    @Indexed
    private String title;
    private String description;
    private String sourceUrl;
    private String rawText;

    private Integer prepTimeMinutes;
    private Integer cookTimeMinutes;
    private Integer servings;

    private Instant createdAt;
    private Instant updatedAt;
}
