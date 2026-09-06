package com.cabinate.api.ingest;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import com.cabinate.api.common.exception.GlobalExceptionHandler;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.ingest.dto.IngestPayloadRequest;
import com.cabinate.api.ingest.dto.RawIngestPayloadResponse;
import com.cabinate.api.ingest.dto.UpdateIngestStatusRequest;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RawIngestControllerTest {

    private MockMvc mockMvc;

    @Mock
    private RawIngestService rawIngestService;

    @InjectMocks
    private RawIngestController rawIngestController;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(rawIngestController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void ingest_WhenValid_ShouldReturn201Created() throws Exception {
        RawIngestPayloadResponse response = new RawIngestPayloadResponse(
                "ingest-1",
                "WEB_SCRAPE",
                "https://example.com/recipe",
                "text/html",
                "<html>Recipe content</html>",
                Map.of("domain", "example.com"),
                "PENDING",
                Instant.now(),
                Instant.now());

        when(rawIngestService.ingest(any(IngestPayloadRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "source": "WEB_SCRAPE",
                    "sourceUrl": "https://example.com/recipe",
                    "contentType": "text/html",
                    "payload": "<html>Recipe content</html>"
                }
                """;

        mockMvc.perform(post("/api/v1/ingest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("ingest-1"))
                .andExpect(jsonPath("$.source").value("WEB_SCRAPE"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void ingest_WhenInvalid_ShouldReturn400BadRequest() throws Exception {
        String invalidPayload = """
                {
                    "source": "",
                    "payload": ""
                }
                """;

        mockMvc.perform(post("/api/v1/ingest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.source").exists())
                .andExpect(jsonPath("$.fieldErrors.payload").exists());
    }

    @Test
    void getPayloads_ShouldReturnList() throws Exception {
        RawIngestPayloadResponse item = new RawIngestPayloadResponse(
                "ingest-1", "CLIPBOARD", null, "text/plain", "Raw recipe text", null, "PENDING", Instant.now(), Instant.now());

        when(rawIngestService.getPayloads("PENDING", null)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/v1/ingest?status=PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("ingest-1"))
                .andExpect(jsonPath("$[0].source").value("CLIPBOARD"));
    }

    @Test
    void getPayloadById_WhenFound_ShouldReturn200() throws Exception {
        RawIngestPayloadResponse item = new RawIngestPayloadResponse(
                "ingest-1", "CLIPBOARD", null, "text/plain", "Raw recipe text", null, "PENDING", Instant.now(), Instant.now());

        when(rawIngestService.getPayloadById("ingest-1")).thenReturn(item);

        mockMvc.perform(get("/api/v1/ingest/ingest-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ingest-1"));
    }

    @Test
    void getPayloadById_WhenNotFound_ShouldReturn404() throws Exception {
        when(rawIngestService.getPayloadById("missing"))
                .thenThrow(new ResourceNotFoundException("RawIngestPayload", "id", "missing"));

        mockMvc.perform(get("/api/v1/ingest/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("RawIngestPayload not found with id: 'missing'"));
    }

    @Test
    void updateStatus_WhenValid_ShouldReturn200() throws Exception {
        RawIngestPayloadResponse response = new RawIngestPayloadResponse(
                "ingest-1", "WEB_SCRAPE", null, "text/html", "Content", null, "PROCESSED", Instant.now(), Instant.now());

        when(rawIngestService.updateStatus(eq("ingest-1"), any(UpdateIngestStatusRequest.class)))
                .thenReturn(response);

        String patchPayload = """
                {
                    "status": "PROCESSED"
                }
                """;

        mockMvc.perform(patch("/api/v1/ingest/ingest-1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patchPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSED"));
    }

    @Test
    void updateStatus_WhenNotFound_ShouldReturn404() throws Exception {
        when(rawIngestService.updateStatus(eq("missing"), any(UpdateIngestStatusRequest.class)))
                .thenThrow(new ResourceNotFoundException("RawIngestPayload", "id", "missing"));

        String patchPayload = """
                {
                    "status": "FAILED"
                }
                """;

        mockMvc.perform(patch("/api/v1/ingest/missing/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patchPayload))
                .andExpect(status().isNotFound());
    }
}
