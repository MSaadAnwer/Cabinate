package com.cabinate.api.pantry;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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
import com.cabinate.api.pantry.dto.CreatePantryItemRequest;
import com.cabinate.api.pantry.dto.PantryItemResponse;
import com.cabinate.api.pantry.dto.UpdatePantryItemRequest;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PantryItemControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PantryItemService pantryItemService;

    @InjectMocks
    private PantryItemController pantryItemController;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(pantryItemController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void createItem_WhenValid_ShouldReturn201Created() throws Exception {
        PantryItemResponse response = new PantryItemResponse(
                "pantry-1",
                "Greek Yogurt",
                500.0,
                "grams",
                "DAIRY",
                "FRIDGE",
                LocalDate.of(2026, 9, 20),
                Instant.now(),
                Instant.now());

        when(pantryItemService.createItem(any(CreatePantryItemRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "name": "Greek Yogurt",
                    "quantity": 500.0,
                    "unit": "grams",
                    "category": "DAIRY",
                    "location": "FRIDGE",
                    "expirationDate": "2026-09-20"
                }
                """;

        mockMvc.perform(post("/api/v1/pantry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("pantry-1"))
                .andExpect(jsonPath("$.name").value("Greek Yogurt"))
                .andExpect(jsonPath("$.quantity").value(500.0))
                .andExpect(jsonPath("$.unit").value("grams"));
    }

    @Test
    void createItem_WhenInvalid_ShouldReturn400BadRequest() throws Exception {
        String invalidPayload = """
                {
                    "name": "",
                    "quantity": -5.0,
                    "unit": ""
                }
                """;

        mockMvc.perform(post("/api/v1/pantry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.quantity").exists())
                .andExpect(jsonPath("$.fieldErrors.unit").exists());
    }

    @Test
    void getAllItems_ShouldReturnList() throws Exception {
        PantryItemResponse item = new PantryItemResponse(
                "pantry-1", "Olive Oil", 1.0, "liter", "PANTRY", "CABINET", null, Instant.now(), Instant.now());
        when(pantryItemService.getAllItems(null, null)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/v1/pantry"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("pantry-1"))
                .andExpect(jsonPath("$[0].name").value("Olive Oil"));
    }

    @Test
    void getExpiringItems_ShouldReturnList() throws Exception {
        PantryItemResponse item = new PantryItemResponse(
                "pantry-1", "Spinach", 1.0, "bag", "PRODUCE", "FRIDGE", LocalDate.of(2026, 9, 8), Instant.now(), Instant.now());
        when(pantryItemService.getExpiringItems(any())).thenReturn(List.of(item));

        mockMvc.perform(get("/api/v1/pantry/expiring?before=2026-09-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Spinach"));
    }

    @Test
    void getItemById_WhenFound_ShouldReturn200() throws Exception {
        PantryItemResponse item = new PantryItemResponse(
                "pantry-1", "Olive Oil", 1.0, "liter", "PANTRY", "CABINET", null, Instant.now(), Instant.now());
        when(pantryItemService.getItemById("pantry-1")).thenReturn(item);

        mockMvc.perform(get("/api/v1/pantry/pantry-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("pantry-1"))
                .andExpect(jsonPath("$.name").value("Olive Oil"));
    }

    @Test
    void getItemById_WhenNotFound_ShouldReturn404() throws Exception {
        when(pantryItemService.getItemById("missing"))
                .thenThrow(new ResourceNotFoundException("PantryItem", "id", "missing"));

        mockMvc.perform(get("/api/v1/pantry/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("PantryItem not found with id: 'missing'"));
    }

    @Test
    void updateItem_WhenValid_ShouldReturn200() throws Exception {
        PantryItemResponse response = new PantryItemResponse(
                "pantry-1", "Extra Virgin Olive Oil", 2.0, "liters", "PANTRY", "CABINET", null, Instant.now(), Instant.now());

        when(pantryItemService.updateItem(eq("pantry-1"), any(UpdatePantryItemRequest.class)))
                .thenReturn(response);

        String updatePayload = """
                {
                    "name": "Extra Virgin Olive Oil",
                    "quantity": 2.0,
                    "unit": "liters",
                    "category": "PANTRY",
                    "location": "CABINET"
                }
                """;

        mockMvc.perform(put("/api/v1/pantry/pantry-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updatePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Extra Virgin Olive Oil"))
                .andExpect(jsonPath("$.quantity").value(2.0));
    }

    @Test
    void deleteItem_WhenFound_ShouldReturn204NoContent() throws Exception {
        doNothing().when(pantryItemService).deleteItem("pantry-1");

        mockMvc.perform(delete("/api/v1/pantry/pantry-1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteItem_WhenNotFound_ShouldReturn404() throws Exception {
        doThrow(new ResourceNotFoundException("PantryItem", "id", "missing"))
                .when(pantryItemService).deleteItem("missing");

        mockMvc.perform(delete("/api/v1/pantry/missing"))
                .andExpect(status().isNotFound());
    }
}
