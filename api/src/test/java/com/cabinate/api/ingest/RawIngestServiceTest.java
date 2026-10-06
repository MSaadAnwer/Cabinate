package com.cabinate.api.ingest;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import com.cabinate.api.common.security.AccountContext;
import org.mockito.junit.jupiter.MockitoExtension;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.ingest.dto.IngestPayloadRequest;
import com.cabinate.api.ingest.dto.RawIngestPayloadResponse;
import com.cabinate.api.ingest.dto.UpdateIngestStatusRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RawIngestServiceTest {

    @Mock
    private RawIngestPayloadRepository repository;

    @InjectMocks
    private RawIngestService rawIngestService;

    private RawIngestPayload samplePayload;

    @Mock
    private AccountContext account;

    @BeforeEach
    void setUp() {
        when(account.id()).thenReturn("account-a");
        samplePayload = RawIngestPayload.builder().ownerId("account-a").version(0L)
                .id("ingest-1")
                .source("WEB_SCRAPE")
                .sourceUrl("https://recipes.com/pasta")
                .contentType("text/html")
                .payload("<html><body>Recipe: Pasta Pomodoro</body></html>")
                .metadata(Map.of("site", "recipes.com"))
                .status("PENDING")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void ingest_ShouldPersistWithPendingStatusAndDefaultContentType() {
        IngestPayloadRequest request = new IngestPayloadRequest(
                "MANUAL_TEXT",
                null,
                null,
                "1 cup flour, 2 eggs, 1/2 cup milk. Whisk and pan fry.",
                Map.of("category", "breakfast"));

        when(repository.save(any(RawIngestPayload.class))).thenAnswer(invocation -> {
            RawIngestPayload entity = invocation.getArgument(0);
            entity.setId("ingest-2");
            return entity;
        });

        RawIngestPayloadResponse response = rawIngestService.ingest(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo("ingest-2");
        assertThat(response.source()).isEqualTo("MANUAL_TEXT");
        assertThat(response.contentType()).isEqualTo("text/plain"); // verified default fallback
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.createdAt()).isNotNull();

        ArgumentCaptor<RawIngestPayload> captor = ArgumentCaptor.forClass(RawIngestPayload.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("PENDING");
    }

    @Test
    void getPayloadById_WhenFound_ShouldReturnResponse() {
        when(repository.findByIdAndOwnerId("ingest-1", "account-a")).thenReturn(Optional.of(samplePayload));

        RawIngestPayloadResponse response = rawIngestService.getPayloadById("ingest-1");

        assertThat(response.id()).isEqualTo("ingest-1");
        assertThat(response.source()).isEqualTo("WEB_SCRAPE");
    }

    @Test
    void getPayloadById_WhenNotFound_ShouldThrowException() {
        when(repository.findByIdAndOwnerId("missing", "account-a")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rawIngestService.getPayloadById("missing"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("RawIngestPayload not found with id: 'missing'");
    }

    @Test
    void getPayloads_WithoutFilters_ShouldReturnAll() {
        when(repository.findByOwnerId("account-a", Pageable.unpaged())).thenReturn(new PageImpl<>(List.of(samplePayload)));

        List<RawIngestPayloadResponse> results = rawIngestService.getPayloads(null, null);

        assertThat(results).hasSize(1);
        verify(repository).findByOwnerId("account-a", Pageable.unpaged());
    }

    @Test
    void getPayloads_WithStatusAndSource_ShouldQueryBoth() {
        when(repository.findByOwnerIdAndStatusIgnoreCaseAndSourceIgnoreCase("account-a", "PENDING", "WEB_SCRAPE", Pageable.unpaged()))
                .thenReturn(new PageImpl<>(List.of(samplePayload)));

        List<RawIngestPayloadResponse> results = rawIngestService.getPayloads("PENDING", "WEB_SCRAPE");

        assertThat(results).hasSize(1);
        verify(repository).findByOwnerIdAndStatusIgnoreCaseAndSourceIgnoreCase("account-a", "PENDING", "WEB_SCRAPE", Pageable.unpaged());
    }

    @Test
    void getPayloads_WithStatusOnly_ShouldQueryStatus() {
        when(repository.findByOwnerIdAndStatusIgnoreCase("account-a", "PENDING", Pageable.unpaged())).thenReturn(new PageImpl<>(List.of(samplePayload)));

        List<RawIngestPayloadResponse> results = rawIngestService.getPayloads("PENDING", null);

        assertThat(results).hasSize(1);
        verify(repository).findByOwnerIdAndStatusIgnoreCase("account-a", "PENDING", Pageable.unpaged());
    }

    @Test
    void getPayloads_WithSourceOnly_ShouldQuerySource() {
        when(repository.findByOwnerIdAndSourceIgnoreCase("account-a", "WEB_SCRAPE", Pageable.unpaged())).thenReturn(new PageImpl<>(List.of(samplePayload)));

        List<RawIngestPayloadResponse> results = rawIngestService.getPayloads(null, "WEB_SCRAPE");

        assertThat(results).hasSize(1);
        verify(repository).findByOwnerIdAndSourceIgnoreCase("account-a", "WEB_SCRAPE", Pageable.unpaged());
    }

    @Test
    void updateStatus_WhenFound_ShouldUpdateStatusAndReturnResponse() {
        UpdateIngestStatusRequest updateReq = new UpdateIngestStatusRequest("processed", 0L);

        when(repository.findByIdAndOwnerId("ingest-1", "account-a")).thenReturn(Optional.of(samplePayload));
        when(repository.save(any(RawIngestPayload.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RawIngestPayloadResponse response = rawIngestService.updateStatus("ingest-1", updateReq);

        assertThat(response.status()).isEqualTo("PROCESSED");
        verify(repository).save(samplePayload);
    }

    @Test
    void updateStatus_WhenNotFound_ShouldThrowException() {
        UpdateIngestStatusRequest updateReq = new UpdateIngestStatusRequest("PROCESSED", 0L);

        when(repository.findByIdAndOwnerId("missing", "account-a")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rawIngestService.updateStatus("missing", updateReq))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).save(any());
    }
}
