package com.cabinate.api.ingest;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.cabinate.api.ingest.dto.IngestPayloadRequest;
import com.cabinate.api.ingest.dto.RawIngestPayloadResponse;
import com.cabinate.api.ingest.dto.UpdateIngestStatusRequest;
import lombok.RequiredArgsConstructor;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1/ingest")
@RequiredArgsConstructor
public class RawIngestController {

    private final RawIngestService rawIngestService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RawIngestPayloadResponse ingest(@Valid @RequestBody IngestPayloadRequest request) {
        return rawIngestService.ingest(request);
    }

    @GetMapping
    public List<RawIngestPayloadResponse> getPayloads(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String source) {
        return rawIngestService.getPayloads(status, source);
    }

    @GetMapping("/{id}")
    public RawIngestPayloadResponse getPayloadById(@PathVariable String id) {
        return rawIngestService.getPayloadById(id);
    }

    @PatchMapping("/{id}/status")
    public RawIngestPayloadResponse updateStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateIngestStatusRequest request) {
        return rawIngestService.updateStatus(id, request);
    }
}
