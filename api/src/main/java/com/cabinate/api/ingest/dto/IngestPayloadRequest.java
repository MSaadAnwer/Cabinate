package com.cabinate.api.ingest.dto;

import java.util.Map;
import jakarta.validation.constraints.NotBlank;

public record IngestPayloadRequest(
        @NotBlank(message = "Source is required (e.g. MANUAL_TEXT, WEB_SCRAPE, JSON_IMPORT)") String source,

        String sourceUrl,

        String contentType,

        @NotBlank(message = "Payload content is required") String payload,

        Map<String, Object> metadata) {
}
