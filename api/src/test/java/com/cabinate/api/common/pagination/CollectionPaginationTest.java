package com.cabinate.api.common.pagination;

import java.util.List;
import com.cabinate.api.common.security.AccountContext;
import com.cabinate.api.common.exception.GlobalExceptionHandler;
import com.cabinate.api.ingest.*;
import com.cabinate.api.pantry.*;
import com.cabinate.api.recipe.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Exercises HTTP binding through real services so bounds and filters reach the database queries. */
class CollectionPaginationTest {
    private final RecipeRepository recipes = mock(RecipeRepository.class);
    private final PantryItemRepository pantry = mock(PantryItemRepository.class);
    private final RawIngestPayloadRepository ingest = mock(RawIngestPayloadRepository.class);
    private MockMvc mvc;
    private final AccountContext account = mock(AccountContext.class);

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

    @Test void defaultsAreBoundedAndOrderingHasAnIdTieBreaker() throws Exception {
        when(recipes.findByOwnerId(eq("account-a"), any(Pageable.class))).thenAnswer(call -> new PageImpl<>(
                List.of(Recipe.builder().ownerId("account-a").version(0L).id("recipe-1").title("Soup").build()), call.getArgument(1), 75));
        when(pantry.findByOwnerId(eq("account-a"), any(Pageable.class))).thenAnswer(call -> new PageImpl<>(
                List.of(PantryItem.builder().ownerId("account-a").version(0L).id("pantry-1").name("Carrots").build()), call.getArgument(1), 75));
        when(ingest.findByOwnerId(eq("account-a"), any(Pageable.class))).thenAnswer(call -> new PageImpl<>(
                List.of(RawIngestPayload.builder().ownerId("account-a").version(0L).id("ingest-1").status("PENDING").build()), call.getArgument(1), 75));
        for (String resource : List.of("recipes", "pantry", "ingest")) {
            mvc.perform(get("/api/v1/" + resource + "/page"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
                    .andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(25))
                    .andExpect(jsonPath("$.totalItems").value(75)).andExpect(jsonPath("$.totalPages").value(3));
        }
        var recent = PageRequest.of(0, 25, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id")));
        verify(recipes).findByOwnerId("account-a", recent);
        verify(ingest).findByOwnerId("account-a", recent);
        verify(pantry).findByOwnerId("account-a", PageRequest.of(0, 25, Sort.by("name").and(Sort.by("id"))));
    }

    @Test void filtersAndRequestedPageReachRepositoriesAndEmptyPagesHaveMetadata() throws Exception {
        when(recipes.findByOwnerIdAndTitleContainingIgnoreCase(eq("account-a"), eq("soup"), any(Pageable.class)))
                .thenAnswer(call -> new PageImpl<Recipe>(List.of(), call.getArgument(2), 0));
        when(pantry.findByOwnerIdAndCategoryIgnoreCaseAndNameContainingIgnoreCase(eq("account-a"), eq("Produce"), eq("carrot"), any(Pageable.class)))
                .thenAnswer(call -> new PageImpl<PantryItem>(List.of(), call.getArgument(3), 0));
        when(ingest.findByOwnerIdAndStatusIgnoreCaseAndSourceIgnoreCase(eq("account-a"), eq("PENDING"), eq("MANUAL_TEXT"), any(Pageable.class)))
                .thenAnswer(call -> new PageImpl<RawIngestPayload>(List.of(), call.getArgument(3), 0));
        mvc.perform(get("/api/v1/recipes/page").param("search", " soup ").param("page", "2").param("size", "10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.size").value(10)).andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get("/api/v1/pantry/page").param("category", " Produce ").param("search", " carrot "))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/ingest/page").param("status", " PENDING ").param("source", " MANUAL_TEXT "))
                .andExpect(status().isOk());
        verify(recipes).findByOwnerIdAndTitleContainingIgnoreCase("account-a", "soup",
                PageRequest.of(2, 10, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id"))));
        verify(pantry, never()).findByOwnerId(eq("account-a"), any(Pageable.class));
        verify(ingest, never()).findByOwnerId(eq("account-a"), any(Pageable.class));
    }

    @Test void invalidPageRequestsAreRejectedBeforeDatabaseAccess() throws Exception {
        for (String resource : List.of("recipes", "pantry", "ingest")) {
            for (String query : List.of("?page=-1", "?size=0", "?size=101", "?page=invalid")) {
                mvc.perform(get("/api/v1/" + resource + "/page" + query))
                        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors").exists());
            }
        }
        verifyNoInteractions(recipes, pantry, ingest);
    }
}
