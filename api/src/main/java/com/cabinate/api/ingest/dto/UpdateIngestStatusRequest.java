package com.cabinate.api.ingest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UpdateIngestStatusRequest(
        @NotBlank(message = "Status is required (e.g. PENDING, PROCESSED, FAILED)")
        @Pattern(regexp = "(?i)\\s*(PENDING|PROCESSED|FAILED)\\s*", message = "Status must be PENDING, PROCESSED or FAILED") String status,
        @NotNull(message = "The record version is required") @Min(0) Long version) {
}
