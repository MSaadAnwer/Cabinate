package com.cabinate.api.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class WebConfigurationTest {
    @RestController
    static class Probe {
        @PatchMapping("/api/v1/probe") String patch() { return "ok"; }
        @GetMapping("/api/v1/probe") String get() { return "ok"; }
    }
    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    static class Mvc {
        @Bean Probe probe() { return new Probe(); }
    }

    @Test void permitsConfiguredOriginsAndPatchPreflightAndRejectsUnknownOrigins() throws Exception {
        try (var context = new AnnotationConfigWebApplicationContext()) {
            context.setServletContext(new MockServletContext());
            context.register(Mvc.class, WebConfiguration.class);
            context.refresh();
            var mvc = MockMvcBuilders.webAppContextSetup(context).build();
            mvc.perform(options("/api/v1/probe").header("Origin", "http://localhost:8082")
                    .header("Access-Control-Request-Method", "PATCH")
                    .header("Access-Control-Request-Headers", "Content-Type"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8082"));
            mvc.perform(get("/api/v1/probe").header("Origin", "https://untrusted.example"))
                    .andExpect(status().isForbidden())
                    .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
            mvc.perform(get("/api/v1/probe")).andExpect(status().isOk());
        }
    }
}
