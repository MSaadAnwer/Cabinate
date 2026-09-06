package com.cabinate.api.ingest;

import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.ingest.dto.IngestPayloadRequest;
import com.cabinate.api.ingest.dto.RawIngestPayloadResponse;
import com.cabinate.api.ingest.dto.UpdateIngestStatusRequest;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RawIngestService {

    private final RawIngestPayloadRepository repository;

    public RawIngestPayloadResponse ingest(IngestPayloadRequest request) {
        Instant now = Instant.now();
        String contentType = (request.contentType() != null && !request.contentType().isBlank())
                ? request.contentType()
                : "text/plain";

        RawIngestPayload payload = RawIngestPayload.builder()
                .source(request.source().trim())
                .sourceUrl(request.sourceUrl())
                .contentType(contentType)
                .payload(request.payload())
                .metadata(request.metadata())
                .status("PENDING")
                .createdAt(now)
                .updatedAt(now)
                .build();

        RawIngestPayload saved = repository.save(payload);
        return RawIngestPayloadResponse.fromEntity(saved);
    }

    public RawIngestPayloadResponse getPayloadById(String id) {
        return repository.findById(id)
                .map(RawIngestPayloadResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("RawIngestPayload", "id", id));
    }

    public List<RawIngestPayloadResponse> getPayloads(String status, String source) {
        boolean hasStatus = status != null && !status.isBlank();
        boolean hasSource = source != null && !source.isBlank();

        List<RawIngestPayload> results;
        if (hasStatus && hasSource) {
            results = repository.findByStatusIgnoreCaseAndSourceIgnoreCase(status.trim(), source.trim());
        } else if (hasStatus) {
            results = repository.findByStatusIgnoreCase(status.trim());
        } else if (hasSource) {
            results = repository.findBySourceIgnoreCase(source.trim());
        } else {
            results = repository.findAll();
        }

        return results.stream()
                .map(RawIngestPayloadResponse::fromEntity)
                .toList();
    }

    public RawIngestPayloadResponse updateStatus(String id, UpdateIngestStatusRequest request) {
        RawIngestPayload existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RawIngestPayload", "id", id));

        existing.setStatus(request.status().trim().toUpperCase());
        existing.setUpdatedAt(Instant.now());

        RawIngestPayload saved = repository.save(existing);
        return RawIngestPayloadResponse.fromEntity(saved);
    }
}
