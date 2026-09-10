package com.cabinate.api.pantry;

import java.time.Instant;
import java.time.LocalDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "pantry_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PantryItem {

    @Id
    private String id;

    private String name;
    private Double quantity;
    private String unit;
    @Indexed
    private String category;
    private String location;

    @Indexed
    private LocalDate expirationDate;

    private Instant createdAt;
    private Instant updatedAt;
}
