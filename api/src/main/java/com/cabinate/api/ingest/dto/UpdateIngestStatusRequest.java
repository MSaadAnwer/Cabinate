package com.cabinate.api.ingest.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateIngestStatusRequest(
        @NotBlank(message = "Status is required (e.g. PENDING, PROCESSED, FAILED)") String status) {
}
