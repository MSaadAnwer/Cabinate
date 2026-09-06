package com.cabinate.api.pantry.dto;

import java.time.Instant;
import java.time.LocalDate;
import com.cabinate.api.pantry.PantryItem;

public record PantryItemResponse(
        String id,
        String name,
        Double quantity,
        String unit,
        String category,
        String location,
        LocalDate expirationDate,
        Instant createdAt,
        Instant updatedAt) {

    public static PantryItemResponse fromEntity(PantryItem item) {
        if (item == null) {
            return null;
        }
        return new PantryItemResponse(
                item.getId(),
                item.getName(),
                item.getQuantity(),
                item.getUnit(),
                item.getCategory(),
                item.getLocation(),
                item.getExpirationDate(),
                item.getCreatedAt(),
                item.getUpdatedAt());
    }
}
