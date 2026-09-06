package com.cabinate.api.ingest.dto;

import java.time.Instant;
import java.util.Map;
import com.cabinate.api.ingest.RawIngestPayload;

public record RawIngestPayloadResponse(
        String id,
        String source,
        String sourceUrl,
        String contentType,
        String payload,
        Map<String, Object> metadata,
        String status,
        Instant createdAt,
        Instant updatedAt) {

    public static RawIngestPayloadResponse fromEntity(RawIngestPayload entity) {
        if (entity == null) {
            return null;
        }
        return new RawIngestPayloadResponse(
                entity.getId(),
                entity.getSource(),
                entity.getSourceUrl(),
                entity.getContentType(),
                entity.getPayload(),
                entity.getMetadata(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
