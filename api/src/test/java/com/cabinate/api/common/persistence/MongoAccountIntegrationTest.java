package com.cabinate.api.common.persistence;

import java.util.UUID;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoClient;
import com.cabinate.api.recipe.*;
import com.cabinate.api.pantry.*;
import com.cabinate.api.ingest.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in real MongoDB checks. Uses and drops only a newly created, randomly named test database. */
@EnabledIfEnvironmentVariable(named = "CABINATE_TEST_MONGODB_URI", matches = ".+")
class MongoAccountIntegrationTest {
    private final String database = "cabinate_access_test_" + UUID.randomUUID().toString().replace("-", "");
    private MongoClient client;
    private RecipeRepository recipes;
    private PantryItemRepository pantry;
    private RawIngestPayloadRepository ingest;
    @BeforeEach void setup() {
        client = MongoClients.create(System.getenv("CABINATE_TEST_MONGODB_URI"));
        var factory = new MongoRepositoryFactory(new MongoTemplate(client, database));
        recipes = factory.getRepository(RecipeRepository.class);
        pantry = factory.getRepository(PantryItemRepository.class);
        ingest = factory.getRepository(RawIngestPayloadRepository.class);
    }
    @AfterEach void cleanup() {
        if (client != null) {
            if (!database.startsWith("cabinate_access_test_")) throw new IllegalStateException("Unsafe test database");
            client.getDatabase(database).drop();
            client.close();
        }
    }

    @Test void databaseQueriesExcludeForeignAndUnownedRecordsAcrossAllFeatures() {
        recipes.save(Recipe.builder().ownerId("a").title("Soup").build());
        var otherRecipe = recipes.save(Recipe.builder().ownerId("b").title("Soup").build());
        recipes.save(Recipe.builder().title("Legacy soup").build());
        pantry.save(PantryItem.builder().ownerId("a").name("Carrots").category("Produce").build());
        var otherItem = pantry.save(PantryItem.builder().ownerId("b").name("Carrots").category("Produce").build());
        ingest.save(RawIngestPayload.builder().ownerId("a").status("PENDING").source("MANUAL").build());
        var otherPayload = ingest.save(RawIngestPayload.builder().ownerId("b").status("PENDING").source("MANUAL").build());
        assertEquals(1, recipes.findByOwnerIdAndTitleContainingIgnoreCase("a", "soup", Pageable.unpaged()).getTotalElements());
        assertEquals(1, pantry.findByOwnerIdAndCategoryIgnoreCaseAndNameContainingIgnoreCase("a", "produce", "carrot", Pageable.unpaged()).getTotalElements());
        assertEquals(1, ingest.findByOwnerIdAndStatusIgnoreCaseAndSourceIgnoreCase("a", "pending", "manual", Pageable.unpaged()).getTotalElements());
        assertTrue(recipes.findByIdAndOwnerId(otherRecipe.getId(), "a").isEmpty());
        assertTrue(pantry.findByIdAndOwnerId(otherItem.getId(), "a").isEmpty());
        assertTrue(ingest.findByIdAndOwnerId(otherPayload.getId(), "a").isEmpty());
    }

    @Test void mongodbInitializesVersionsAndRejectsStaleSavesAndDeletes() {
        var recipe = recipes.save(Recipe.builder().ownerId("a").title("Original").build());
        assertEquals(0L, recipe.getVersion());
        var stale = recipes.findByIdAndOwnerId(recipe.getId(), "a").orElseThrow();
        recipe.setTitle("Latest");
        var saved = recipes.save(recipe);
        assertEquals(1L, saved.getVersion());
        assertThrows(OptimisticLockingFailureException.class, () -> recipes.save(stale));
        // A failed save mutates the in-memory version, so read a separate stale snapshot explicitly.
        stale.setVersion(0L);
        assertThrows(OptimisticLockingFailureException.class, () -> recipes.delete(stale));
        assertEquals("Latest", recipes.findByIdAndOwnerId(recipe.getId(), "a").orElseThrow().getTitle());
        recipes.delete(saved);
        assertTrue(recipes.findByIdAndOwnerId(recipe.getId(), "a").isEmpty());
    }
}
