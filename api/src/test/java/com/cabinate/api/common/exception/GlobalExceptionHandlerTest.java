package com.cabinate.api.common.exception;

import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;

class GlobalExceptionHandlerTest {
    private MockMvc mvc;

    @RestController
    static class Probe {
        @GetMapping("/probe") String read(@RequestParam int count) { return "ok"; }
        @PostMapping(value = "/probe", consumes = MediaType.APPLICATION_JSON_VALUE)
        Map<String, Object> write(@RequestBody Map<String, Object> value) { return value; }
        @GetMapping("/database") String database() {
            throw new DataAccessResourceFailureException("mongodb://private-host/secret");
        }
    }

    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new Probe()).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test void preservesMethodStatusAndAllowHeader() throws Exception {
        mvc.perform(delete("/probe")).andExpect(status().isMethodNotAllowed())
                .andExpect(header().string("Allow", containsString("GET")))
                .andExpect(jsonPath("$.status").value(405)).andExpect(jsonPath("$.path").value("/probe"));
    }

    @Test void returnsClientErrorsForMissingAndInvalidParameters() throws Exception {
        mvc.perform(get("/probe")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        mvc.perform(get("/probe?count=secret-invalid-value")).andExpect(status().isBadRequest())
                .andExpect(content().string(not(containsString("secret-invalid-value"))));
    }

    @Test void preservesUnsupportedMediaTypeAndDoesNotExposeParserDetails() throws Exception {
        mvc.perform(post("/probe").contentType(MediaType.TEXT_PLAIN).content("secret"))
                .andExpect(status().isUnsupportedMediaType()).andExpect(jsonPath("$.status").value(415));
        mvc.perform(post("/probe").contentType(MediaType.APPLICATION_JSON).content("{secret-invalid-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed JSON request or invalid data format."))
                .andExpect(content().string(not(containsString("secret-invalid-json"))));
    }

    @Test void databaseOutageIsRetryableAndDoesNotExposeConnectionDetails() throws Exception {
        mvc.perform(get("/database")).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(content().string(not(containsString("private-host"))));
    }
}
