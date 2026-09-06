package com.cabinate.api.ingest;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RawIngestPayloadRepository extends MongoRepository<RawIngestPayload, String> {

    List<RawIngestPayload> findByStatusIgnoreCase(String status);

    List<RawIngestPayload> findBySourceIgnoreCase(String source);

    List<RawIngestPayload> findByStatusIgnoreCaseAndSourceIgnoreCase(String status, String source);
}
