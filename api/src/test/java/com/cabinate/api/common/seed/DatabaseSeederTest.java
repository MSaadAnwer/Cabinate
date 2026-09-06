package com.cabinate.api.common.seed;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.cabinate.api.ingest.RawIngestPayloadRepository;
import com.cabinate.api.pantry.PantryItemRepository;
import com.cabinate.api.recipe.RecipeRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatabaseSeederTest {

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private PantryItemRepository pantryItemRepository;

    @Mock
    private RawIngestPayloadRepository rawIngestPayloadRepository;

    @InjectMocks
    private DatabaseSeeder databaseSeeder;

    @Test
    void seedIfEmpty_WhenDatabaseEmpty_ShouldPopulateAllCollections() {
        when(recipeRepository.count()).thenReturn(0L);
        when(pantryItemRepository.count()).thenReturn(0L);
        when(rawIngestPayloadRepository.count()).thenReturn(0L);

        Map<String, Integer> result = databaseSeeder.seedIfEmpty();

        assertThat(result.get("recipesSeeded")).isEqualTo(5);
        assertThat(result.get("pantryItemsSeeded")).isEqualTo(10);
        assertThat(result.get("ingestPayloadsSeeded")).isEqualTo(3);

        verify(recipeRepository).saveAll(anyList());
        verify(pantryItemRepository).saveAll(anyList());
        verify(rawIngestPayloadRepository).saveAll(anyList());
    }

    @Test
    void seedIfEmpty_WhenDatabaseAlreadyPopulated_ShouldSkipAll() {
        when(recipeRepository.count()).thenReturn(5L);
        when(pantryItemRepository.count()).thenReturn(10L);
        when(rawIngestPayloadRepository.count()).thenReturn(3L);

        Map<String, Integer> result = databaseSeeder.seedIfEmpty();

        assertThat(result.get("recipesSeeded")).isEqualTo(0);
        assertThat(result.get("pantryItemsSeeded")).isEqualTo(0);
        assertThat(result.get("ingestPayloadsSeeded")).isEqualTo(0);

        verify(recipeRepository, never()).saveAll(anyList());
        verify(pantryItemRepository, never()).saveAll(anyList());
        verify(rawIngestPayloadRepository, never()).saveAll(anyList());
    }

    @Test
    void seedAll_WhenForced_ShouldWipeAndRepopulate() {
        Map<String, Integer> result = databaseSeeder.seedAll(true);

        assertThat(result.get("recipesSeeded")).isEqualTo(5);
        assertThat(result.get("pantryItemsSeeded")).isEqualTo(10);
        assertThat(result.get("ingestPayloadsSeeded")).isEqualTo(3);

        verify(recipeRepository).deleteAll();
        verify(pantryItemRepository).deleteAll();
        verify(rawIngestPayloadRepository).deleteAll();

        verify(recipeRepository).saveAll(anyList());
        verify(pantryItemRepository).saveAll(anyList());
        verify(rawIngestPayloadRepository).saveAll(anyList());
    }
}
