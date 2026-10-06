package com.cabinate.api.ingest;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.cabinate.api.common.pagination.PageResponse;
import org.springframework.stereotype.Service;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.ingest.dto.IngestPayloadRequest;
import com.cabinate.api.ingest.dto.RawIngestPayloadResponse;
import com.cabinate.api.ingest.dto.UpdateIngestStatusRequest;
import lombok.RequiredArgsConstructor;
import com.cabinate.api.common.security.AccountContext;
import com.cabinate.api.common.persistence.WriteVersion;

@Service
@RequiredArgsConstructor
public class RawIngestService {

    private final RawIngestPayloadRepository repository;
    private final AccountContext account;

    public RawIngestPayloadResponse ingest(IngestPayloadRequest request) {
        Instant now = Instant.now();
        String contentType = (request.contentType() != null && !request.contentType().isBlank())
                ? request.contentType().trim()
                : "text/plain";

        RawIngestPayload payload = RawIngestPayload.builder()
                .ownerId(account.id())
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
        return repository.findByIdAndOwnerId(id, account.id())
                .map(RawIngestPayloadResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("RawIngestPayload", "id", id));
    }

    public List<RawIngestPayloadResponse> getPayloads(String status, String source) {
        return getPayloadPage(status, source, Pageable.unpaged()).items();
    }

    public RawIngestPayloadResponse updateStatus(String id, UpdateIngestStatusRequest request) {
        RawIngestPayload existing = repository.findByIdAndOwnerId(id, account.id())
                .orElseThrow(() -> new ResourceNotFoundException("RawIngestPayload", "id", id));

        WriteVersion.check(request.version(), existing.getVersion());
        existing.setStatus(request.status().trim().toUpperCase(Locale.ROOT));
        existing.setUpdatedAt(Instant.now());

        RawIngestPayload saved = repository.save(existing);
        return RawIngestPayloadResponse.fromEntity(saved);
    }

    public PageResponse<RawIngestPayloadResponse> getPayloadPage(String status, String source, Pageable pageable) {
        boolean hasStatus = status != null && !status.isBlank();
        boolean hasSource = source != null && !source.isBlank();
        Page<RawIngestPayload> page;
        if (hasStatus && hasSource) {
            page = repository.findByOwnerIdAndStatusIgnoreCaseAndSourceIgnoreCase(account.id(), status.trim(), source.trim(), pageable);
        } else if (hasStatus) {
            page = repository.findByOwnerIdAndStatusIgnoreCase(account.id(), status.trim(), pageable);
        } else if (hasSource) {
            page = repository.findByOwnerIdAndSourceIgnoreCase(account.id(), source.trim(), pageable);
        } else {
            page = repository.findByOwnerId(account.id(), pageable);
        }
        return PageResponse.from(page.map(RawIngestPayloadResponse::fromEntity));
    }
}
