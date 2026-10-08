package com.cabinate.api.receipt;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ReceiptDraftRepository extends MongoRepository<ReceiptDraft, String> {
    Optional<ReceiptDraft> findByIdAndOwnerId(String id, String ownerId);
    Optional<ReceiptDraft> findByOwnerIdAndSourceHash(String ownerId, String sourceHash);
}
