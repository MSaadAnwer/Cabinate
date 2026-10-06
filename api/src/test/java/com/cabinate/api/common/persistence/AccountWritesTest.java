package com.cabinate.api.common.persistence;

import java.util.Optional;
import com.cabinate.api.common.exception.GlobalExceptionHandler;
import com.cabinate.api.common.security.AccountContext;
import com.cabinate.api.recipe.*;
import com.cabinate.api.pantry.*;
import com.cabinate.api.ingest.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AccountWritesTest {
    private final RecipeRepository recipes = mock(RecipeRepository.class);
    private final PantryItemRepository pantry = mock(PantryItemRepository.class);
    private final RawIngestPayloadRepository ingest = mock(RawIngestPayloadRepository.class);
    private final AccountContext account = mock(AccountContext.class);
    private MockMvc mvc;
    private static final String RECIPE = "{\"title\":\"Soup\",\"rawText\":\"Cook carrots\",\"version\":0}";
    private static final String ITEM = "{\"name\":\"Carrots\",\"quantity\":1,\"unit\":\"kg\",\"version\":0}";
    private static final String STATUS = "{\"status\":\"PROCESSED\",\"version\":0}";

    @BeforeEach void setup() {
        when(account.id()).thenReturn("account-a");
        var validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(
                new RecipeController(new RecipeService(recipes, account), mock(RecipeGenerationService.class)),
                new PantryItemController(new PantryItemService(pantry, account)),
                new RawIngestController(new RawIngestService(ingest, account)))
                .setControllerAdvice(new GlobalExceptionHandler()).setValidator(validator).build();
    }

    @Test void foreignRecordsCannotBeReadUpdatedOrDeleted() throws Exception {
        for (String resource : new String[]{"recipes", "pantry", "ingest"}) {
            mvc.perform(get("/api/v1/" + resource + "/foreign")).andExpect(status().isNotFound());
        }
        mvc.perform(put("/api/v1/recipes/foreign").contentType(MediaType.APPLICATION_JSON).content(RECIPE)).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/pantry/foreign").contentType(MediaType.APPLICATION_JSON).content(ITEM)).andExpect(status().isNotFound());
        mvc.perform(patch("/api/v1/ingest/foreign/status").contentType(MediaType.APPLICATION_JSON).content(STATUS)).andExpect(status().isNotFound());
        for (String resource : new String[]{"recipes", "pantry"}) {
            mvc.perform(delete("/api/v1/" + resource + "/foreign").header("If-Match", "\"0\""))
                    .andExpect(status().isNotFound());
        }
        verify(recipes, atLeastOnce()).findByIdAndOwnerId("foreign", "account-a");
        verify(pantry, atLeastOnce()).findByIdAndOwnerId("foreign", "account-a");
        verify(ingest, atLeastOnce()).findByIdAndOwnerId("foreign", "account-a");
        verify(recipes, never()).save(any()); verify(pantry, never()).save(any()); verify(ingest, never()).save(any());
        verify(recipes, never()).delete(any(Recipe.class)); verify(pantry, never()).delete(any(PantryItem.class));
    }

    @Test void staleVersionsRejectAllWritesBeforePersistence() throws Exception {
        when(recipes.findByIdAndOwnerId("record", "account-a"))
                .thenReturn(Optional.of(Recipe.builder().id("record").ownerId("account-a").version(1L).build()));
        when(pantry.findByIdAndOwnerId("record", "account-a"))
                .thenReturn(Optional.of(PantryItem.builder().id("record").ownerId("account-a").version(1L).build()));
        when(ingest.findByIdAndOwnerId("record", "account-a"))
                .thenReturn(Optional.of(RawIngestPayload.builder().id("record").ownerId("account-a").version(1L).build()));
        mvc.perform(put("/api/v1/recipes/record").contentType(MediaType.APPLICATION_JSON).content(RECIPE)).andExpect(status().isConflict());
        mvc.perform(put("/api/v1/pantry/record").contentType(MediaType.APPLICATION_JSON).content(ITEM)).andExpect(status().isConflict());
        mvc.perform(patch("/api/v1/ingest/record/status").contentType(MediaType.APPLICATION_JSON).content(STATUS)).andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/recipes/record").header("If-Match", "\"0\"")).andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/pantry/record").header("If-Match", "\"0\"")).andExpect(status().isConflict());
        verify(recipes, never()).save(any()); verify(pantry, never()).save(any()); verify(ingest, never()).save(any());
        verify(recipes, never()).delete(any(Recipe.class)); verify(pantry, never()).delete(any(PantryItem.class));
    }

    @Test void racesDuringSaveAndDeleteAreReportedAsConflicts() throws Exception {
        var recipe = Recipe.builder().id("record").ownerId("account-a").version(0L).build();
        when(recipes.findByIdAndOwnerId("record", "account-a")).thenReturn(Optional.of(recipe));
        when(recipes.save(any(Recipe.class))).thenThrow(new OptimisticLockingFailureException("Race"));
        doThrow(new OptimisticLockingFailureException("Race")).when(recipes).delete(recipe);
        mvc.perform(put("/api/v1/recipes/record").contentType(MediaType.APPLICATION_JSON).content(RECIPE))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("This record changed. Refresh it and try again."));
        mvc.perform(delete("/api/v1/recipes/record").header("If-Match", "\"0\"")).andExpect(status().isConflict());
    }

    @Test void missingVersionsAndUnsafeDeletePreconditionsNeverReachRepositories() throws Exception {
        mvc.perform(put("/api/v1/recipes/record").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Soup\",\"rawText\":\"Cook\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.version").exists());
        mvc.perform(delete("/api/v1/recipes/record")).andExpect(status().is(428));
        for (String invalid : new String[]{"*", "W/\"0\"", "0", "\"-1\"", "\"99999999999999999999999\""}) {
            mvc.perform(delete("/api/v1/pantry/record").header("If-Match", invalid)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(recipes, pantry, ingest);
    }

    @Test void createAssignsAuthenticatedAccountDespiteSpoofedOwnership() throws Exception {
        when(recipes.save(any(Recipe.class))).thenAnswer(call -> {
            Recipe value = call.getArgument(0);
            value.setId("created"); value.setVersion(0L);
            return value;
        });
        mvc.perform(post("/api/v1/recipes").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Soup\",\"rawText\":\"Cook\",\"ownerId\":\"account-b\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.version").value(0));
        verify(recipes).save(argThat(value -> "account-a".equals(value.getOwnerId())));
    }
}
