package com.cabinate.api.ingest;

import java.time.Instant;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "raw_ingest_payloads")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RawIngestPayload {

    @Id
    private String id;

    private String source;
    private String sourceUrl;
    private String contentType;
    private String payload;
    private Map<String, Object> metadata;
    private String status;

    private Instant createdAt;
    private Instant updatedAt;
}
