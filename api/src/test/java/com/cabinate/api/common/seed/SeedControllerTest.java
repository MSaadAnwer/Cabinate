package com.cabinate.api.common.seed;

import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SeedControllerTest {

    private MockMvc mockMvc;

    @Mock
    private DatabaseSeeder databaseSeeder;

    @InjectMocks
    private SeedController seedController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(seedController).build();
    }

    @Test
    void triggerSeed_WithoutForce_ShouldCallSeederWithFalse() throws Exception {
        when(databaseSeeder.seedAll(false)).thenReturn(Map.of(
                "recipesSeeded", 5,
                "pantryItemsSeeded", 10,
                "ingestPayloadsSeeded", 3));

        mockMvc.perform(post("/api/v1/seed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.forced").value(false))
                .andExpect(jsonPath("$.summary.recipesSeeded").value(5))
                .andExpect(jsonPath("$.summary.pantryItemsSeeded").value(10))
                .andExpect(jsonPath("$.summary.ingestPayloadsSeeded").value(3));
    }

    @Test
    void triggerSeed_WithForceTrue_ShouldCallSeederWithTrue() throws Exception {
        when(databaseSeeder.seedAll(true)).thenReturn(Map.of(
                "recipesSeeded", 5,
                "pantryItemsSeeded", 10,
                "ingestPayloadsSeeded", 3));

        mockMvc.perform(post("/api/v1/seed?force=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.forced").value(true))
                .andExpect(jsonPath("$.summary.recipesSeeded").value(5));
    }
}
