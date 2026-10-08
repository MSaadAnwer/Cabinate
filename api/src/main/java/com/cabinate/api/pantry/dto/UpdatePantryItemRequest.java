package com.cabinate.api.pantry.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpdatePantryItemRequest(
        @NotBlank(message = "Item name is required") @Size(max = 120, message = "Item name cannot exceed 120 characters") String name,

        @NotNull(message = "Quantity is required") @PositiveOrZero(message = "Quantity cannot be negative") Double quantity,

        @NotBlank(message = "Unit is required (e.g. g, ml, pcs)") String unit,

        String category,

        String location,

        LocalDate expirationDate,
        @NotNull(message = "The record version is required") @Min(0) Long version) {
}
