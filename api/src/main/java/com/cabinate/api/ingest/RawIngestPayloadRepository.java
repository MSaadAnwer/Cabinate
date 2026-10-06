package com.cabinate.api.ingest;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RawIngestPayloadRepository extends MongoRepository<RawIngestPayload, String> {
    Page<RawIngestPayload> findByOwnerId(String ownerId, Pageable pageable);
    Optional<RawIngestPayload> findByIdAndOwnerId(String id, String ownerId);
    Page<RawIngestPayload> findByOwnerIdAndStatusIgnoreCase(String ownerId, String status, Pageable pageable);
    Page<RawIngestPayload> findByOwnerIdAndSourceIgnoreCase(String ownerId, String source, Pageable pageable);
    Page<RawIngestPayload> findByOwnerIdAndStatusIgnoreCaseAndSourceIgnoreCase(String ownerId, String status, String source, Pageable pageable);
    long countByOwnerId(String ownerId);
    void deleteByOwnerId(String ownerId);
}
