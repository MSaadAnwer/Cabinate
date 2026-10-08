package com.cabinate.api.receipt;

import java.util.List;
import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import com.cabinate.api.common.exception.GlobalExceptionHandler;
import tools.jackson.databind.json.JsonMapper;
import static com.cabinate.api.receipt.ReceiptContracts.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ReceiptControllerTest {
    private final ReceiptService service = mock(ReceiptService.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private MockMvc mvc;
    @BeforeEach void setup() {
        var validator = new LocalValidatorFactoryBean(); validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new ReceiptController(service)).setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator).addFilters(new ReceiptUploadFilter(mapper)).build();
    }

    @Test void extractsGetsAndConfirmsWithStableContract() throws Exception {
        var draft = DraftResponse.from(ReceiptServiceTest.draft());
        when(service.extract(any())).thenReturn(draft);
        when(service.get("receipt")).thenReturn(draft);
        when(service.confirm(eq("receipt"), any())).thenReturn(new ConfirmResponse("receipt", List.of()));
        mvc.perform(post("/api/v1/receipts/extract").contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Rice 1 pack\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("READY"))
                .andExpect(jsonPath("$.items[0].kind").value("FOOD"));
        mvc.perform(get("/api/v1/receipts/receipt")).andExpect(status().isOk()).andExpect(jsonPath("$.confirmedItems").isArray());
        mvc.perform(post("/api/v1/receipts/receipt/confirm").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(
                        new ConfirmRequest(0L, List.of(ReceiptServiceTest.selected("line-a", "Rice", 1))))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.receiptId").value("receipt"));
    }

    @Test void rejectsMissingFalseAndInvalidConfirmationFieldsBeforeService() throws Exception {
        for (var body : List.of(
                "{\"version\":0,\"items\":[]}",
                "{\"items\":[{\"lineId\":\"line-a\",\"name\":\"Rice\",\"quantity\":1,\"unit\":\"pack\",\"category\":\"GRAINS\",\"location\":\"CABINET\",\"foodConfirmed\":true}]}",
                "{\"version\":0,\"items\":[null]}",
                mapper.writeValueAsString(new ConfirmRequest(0L, List.of(new ConfirmItem("line-a", "Rice", 1.0, "pack", "GRAINS", "CABINET", null, false)))),
                mapper.writeValueAsString(new ConfirmRequest(0L, List.of(ReceiptServiceTest.selected("line-a", "Rice", 0)))))) {
            mvc.perform(post("/api/v1/receipts/receipt/confirm").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test void reportsKnownLengthOversizedUploadsWithoutParsingOrProvider() throws Exception {
        mvc.perform(post("/api/v1/receipts/extract").servletPath("/api/v1/receipts/extract")
                        .contentType(MediaType.APPLICATION_JSON).content("x".repeat(ReceiptUploadFilter.MAX_REQUEST_BYTES + 1)))
                .andExpect(status().isPayloadTooLarge()).andExpect(jsonPath("$.status").value(413));
        verifyNoInteractions(service);
    }

    @Test void boundsUnknownLengthStreamBeforeJsonAllocationAndReturns413() throws Exception {
        Filter unknownLength = (request, response, chain) -> chain.doFilter(new HttpServletRequestWrapper((HttpServletRequest) request) {
            @Override public long getContentLengthLong() { return -1; }
            @Override public int getContentLength() { return -1; }
        }, response);
        mvc = MockMvcBuilders.standaloneSetup(new ReceiptController(service)).setControllerAdvice(new GlobalExceptionHandler())
                .addFilters(unknownLength, new ReceiptUploadFilter(mapper)).build();
        mvc.perform(post("/api/v1/receipts/extract").servletPath("/api/v1/receipts/extract")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"imageBase64\":\"" + "A".repeat(ReceiptUploadFilter.MAX_REQUEST_BYTES) + "\",\"mediaType\":\"image/png\"}"))
                .andExpect(status().isPayloadTooLarge());
        verifyNoInteractions(service);
    }

    @Test void providerErrorsUseSafeStandardErrorResponse() throws Exception {
        when(service.extract(any())).thenThrow(ReceiptException.invalidResponse());
        mvc.perform(post("/api/v1/receipts/extract").contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Rice\"}"))
                .andExpect(status().isBadGateway()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("clearer photo")));
    }
}
