package com.cabinate.api.common.seed;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import com.cabinate.api.ingest.RawIngestPayload;
import com.cabinate.api.ingest.RawIngestPayloadRepository;
import com.cabinate.api.pantry.PantryItem;
import com.cabinate.api.pantry.PantryItemRepository;
import com.cabinate.api.recipe.Recipe;
import com.cabinate.api.recipe.RecipeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final RecipeRepository recipeRepository;
    private final PantryItemRepository pantryItemRepository;
    private final RawIngestPayloadRepository rawIngestPayloadRepository;

    @Value("${cabinate.seed.enabled:true}")
    private boolean seedOnStartup;

    @Override
    public void run(String... args) {
        if (!seedOnStartup) {
            log.info("Database seeding on startup is disabled via configuration.");
            return;
        }

        try {
            seedIfEmpty();
        } catch (Exception ex) {
            log.warn("Database seeding on startup was skipped or encountered an error: {}", ex.getMessage());
        }
    }

    public Map<String, Integer> seedIfEmpty() {
        return seedAll(false);
    }

    public Map<String, Integer> seedAll(boolean force) {
        int recipesSeeded = seedRecipes(force);
        int pantrySeeded = seedPantry(force);
        int ingestSeeded = seedIngestPayloads(force);

        log.info("Database seeding completed. Recipes: {}, Pantry Items: {}, Ingest Payloads: {}",
                recipesSeeded, pantrySeeded, ingestSeeded);

        return Map.of(
                "recipesSeeded", recipesSeeded,
                "pantryItemsSeeded", pantrySeeded,
                "ingestPayloadsSeeded", ingestSeeded);
    }

    private int seedRecipes(boolean force) {
        if (!force && recipeRepository.count() > 0) {
            log.info("Recipes collection already has data. Skipping recipe seeding.");
            return 0;
        }

        if (force) {
            recipeRepository.deleteAll();
        }

        Instant now = Instant.now();
        List<Recipe> recipes = List.of(
                Recipe.builder()
                        .title("Classic Mediterranean Shakshuka")
                        .description("Poached eggs in a fragrant, spiced tomato and bell pepper sauce topped with feta.")
                        .sourceUrl("https://example.com/shakshuka")
                        .rawText("""
                                Ingredients:
                                - 4 large eggs
                                - 1 can (28 oz) whole peeled crushed tomatoes
                                - 1 large red bell pepper, chopped
                                - 1 yellow onion, diced
                                - 3 cloves garlic, minced
                                - 1 tsp ground cumin, 1 tsp paprika, 1/2 tsp red pepper flakes
                                - 2 tbsp extra virgin olive oil
                                - 50g crumbled feta cheese & fresh cilantro

                                Instructions:
                                1. Heat olive oil in a skillet over medium heat. Sauté onions and bell peppers for 5 minutes.
                                2. Add garlic, cumin, paprika, and chili flakes; cook for 1 minute until fragrant.
                                3. Pour in tomatoes, season with salt and pepper, and simmer for 10 minutes until sauce thickens.
                                4. Create 4 small wells with a spoon; crack an egg into each well.
                                5. Cover and simmer gently for 5-8 minutes until whites are set and yolks remain runny.
                                6. Garnish with feta and cilantro. Serve warm with crusty bread.
                                """)
                        .prepTimeMinutes(10)
                        .cookTimeMinutes(20)
                        .servings(4)
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                Recipe.builder()
                        .title("Sheet Pan Lemon Herb Salmon & Asparagus")
                        .description("Flaky wild salmon baked alongside tender asparagus and lemon slices for an easy high-protein dinner.")
                        .sourceUrl("https://example.com/lemon-salmon")
                        .rawText("""
                                Ingredients:
                                - 3 wild Atlantic salmon fillets (6 oz each)
                                - 1 lb fresh asparagus, woody ends snapped
                                - 2 tbsp extra virgin olive oil
                                - 1 lemon, sliced thin + juice of 1/2 lemon
                                - 2 cloves garlic, finely grated
                                - 1 tbsp fresh dill, chopped
                                - Salt and cracked black pepper to taste

                                Instructions:
                                1. Preheat oven to 400°F (200°C) and line a large sheet pan with parchment.
                                2. Toss asparagus with 1 tbsp olive oil, salt, and pepper; spread onto one side of the pan.
                                3. Place salmon fillets skin-side down on the other side.
                                4. Brush salmon with remaining olive oil, minced garlic, lemon juice, salt, pepper, and dill.
                                5. Top each fillet with lemon slices.
                                6. Bake for 12-15 minutes until salmon flakes easily with a fork.
                                """)
                        .prepTimeMinutes(10)
                        .cookTimeMinutes(15)
                        .servings(3)
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                Recipe.builder()
                        .title("Creamy Garlic Parmesan Fettuccine")
                        .description("Al dente pasta coated in a rich, velvety garlic parmesan reduction.")
                        .sourceUrl("https://example.com/garlic-pasta")
                        .rawText("""
                                Ingredients:
                                - 8 oz fettuccine pasta
                                - 3 tbsp unsalted butter
                                - 4 cloves garlic, thinly sliced
                                - 1 cup heavy cream
                                - 1 cup freshly grated Parmigiano-Reggiano
                                - Pinch of nutmeg, salt and black pepper
                                - Fresh parsley for garnish

                                Instructions:
                                1. Cook fettuccine in salted water until al dente; reserve 1/2 cup pasta water.
                                2. Melt butter in a large skillet over medium-low heat; gently sauté garlic for 2 minutes without browning.
                                3. Pour in heavy cream and bring to a gentle simmer for 3 minutes.
                                4. Whisk in grated parmesan until smooth and melted.
                                5. Toss in pasta and reserved pasta water as needed until sauce clings to pasta.
                                """)
                        .prepTimeMinutes(5)
                        .cookTimeMinutes(15)
                        .servings(2)
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                Recipe.builder()
                        .title("High-Protein Wild Berry Oatmeal Bowl")
                        .description("Warm rolled oats infused with vanilla protein, topped with fresh berries and chia seeds.")
                        .sourceUrl("https://example.com/protein-oats")
                        .rawText("""
                                Ingredients:
                                - 1/2 cup rolled oats
                                - 1 cup unsweetened almond milk
                                - 1 scoop vanilla whey or plant protein
                                - 1/2 cup mixed blueberries and raspberries
                                - 1 tbsp chia seeds
                                - 1 tsp honey or pure maple syrup

                                Instructions:
                                1. Cook oats in almond milk over medium heat for 4-5 minutes until creamy.
                                2. Remove from heat and allow to cool slightly for 1 minute.
                                3. Stir in protein powder and chia seeds until thoroughly incorporated.
                                4. Top with fresh berries and drizzle with honey.
                                """)
                        .prepTimeMinutes(3)
                        .cookTimeMinutes(5)
                        .servings(1)
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                Recipe.builder()
                        .title("Crispy Chickpea & Quinoa Nourish Bowl")
                        .description("Nutrient-dense grain bowl with spiced crispy chickpeas, tender quinoa, avocado, and tahini drizzle.")
                        .sourceUrl("https://example.com/chickpea-bowl")
                        .rawText("""
                                Ingredients:
                                - 1 cup cooked tricolor quinoa
                                - 1 can (15 oz) chickpeas, rinsed, dried, and tossed with smoked paprika and cumin
                                - 2 cups fresh baby spinach
                                - 1 ripe avocado, sliced
                                - 2 tbsp creamy tahini
                                - 1 tbsp lemon juice + 1 tbsp warm water

                                Instructions:
                                1. Roast chickpeas at 400°F (200°C) with olive oil and spices for 20 minutes until crisp.
                                2. Whisk tahini, lemon juice, water, salt, and garlic powder for the dressing.
                                3. Assemble bowls with a bed of spinach, cooked quinoa, and sliced avocado.
                                4. Top with warm crispy chickpeas and drizzle with tahini dressing.
                                """)
                        .prepTimeMinutes(15)
                        .cookTimeMinutes(20)
                        .servings(2)
                        .createdAt(now)
                        .updatedAt(now)
                        .build()
        );

        recipeRepository.saveAll(recipes);
        return recipes.size();
    }

    private int seedPantry(boolean force) {
        if (!force && pantryItemRepository.count() > 0) {
            log.info("Pantry collection already has data. Skipping pantry seeding.");
            return 0;
        }

        if (force) {
            pantryItemRepository.deleteAll();
        }

        Instant now = Instant.now();
        LocalDate today = LocalDate.now();

        List<PantryItem> items = List.of(
                // Expiring soon (triggers /expiring query <= 7 days)
                PantryItem.builder()
                        .name("Baby Spinach")
                        .quantity(1.0)
                        .unit("bag")
                        .category("PRODUCE")
                        .location("FRIDGE")
                        .expirationDate(today.plusDays(2))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                PantryItem.builder()
                        .name("Organic Pasture-Raised Eggs")
                        .quantity(12.0)
                        .unit("pcs")
                        .category("DAIRY")
                        .location("FRIDGE")
                        .expirationDate(today.plusDays(4))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                PantryItem.builder()
                        .name("Plain Greek Yogurt")
                        .quantity(500.0)
                        .unit("grams")
                        .category("DAIRY")
                        .location("FRIDGE")
                        .expirationDate(today.plusDays(6))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                // Fridge / Freezer stable
                PantryItem.builder()
                        .name("Unsweetened Almond Milk")
                        .quantity(1.0)
                        .unit("liter")
                        .category("DAIRY")
                        .location("FRIDGE")
                        .expirationDate(today.plusDays(14))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                PantryItem.builder()
                        .name("Wild Atlantic Salmon Fillets")
                        .quantity(3.0)
                        .unit("fillets")
                        .category("MEAT")
                        .location("FREEZER")
                        .expirationDate(today.plusDays(90))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                // Cabinet / Pantry dry goods
                PantryItem.builder()
                        .name("Extra Virgin Olive Oil")
                        .quantity(1.0)
                        .unit("bottle")
                        .category("PANTRY")
                        .location("CABINET")
                        .expirationDate(today.plusDays(180))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                PantryItem.builder()
                        .name("Organic Rolled Oats")
                        .quantity(1000.0)
                        .unit("grams")
                        .category("GRAINS")
                        .location("CABINET")
                        .expirationDate(today.plusDays(120))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                PantryItem.builder()
                        .name("Bronze Cut Fettuccine")
                        .quantity(500.0)
                        .unit("grams")
                        .category("PANTRY")
                        .location("CABINET")
                        .expirationDate(today.plusDays(240))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                PantryItem.builder()
                        .name("San Marzano Crushed Tomatoes")
                        .quantity(2.0)
                        .unit("cans")
                        .category("PANTRY")
                        .location("CABINET")
                        .expirationDate(today.plusDays(365))
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                PantryItem.builder()
                        .name("Garlic")
                        .quantity(3.0)
                        .unit("heads")
                        .category("PRODUCE")
                        .location("CABINET")
                        .expirationDate(today.plusDays(25))
                        .createdAt(now)
                        .updatedAt(now)
                        .build()
        );

        pantryItemRepository.saveAll(items);
        return items.size();
    }

    private int seedIngestPayloads(boolean force) {
        if (!force && rawIngestPayloadRepository.count() > 0) {
            log.info("Raw Ingest collection already has data. Skipping ingest seeding.");
            return 0;
        }

        if (force) {
            rawIngestPayloadRepository.deleteAll();
        }

        Instant now = Instant.now();

        List<RawIngestPayload> payloads = List.of(
                RawIngestPayload.builder()
                        .source("WEB_SCRAPE")
                        .sourceUrl("https://minimalistbaker.com/crispy-tofu-stir-fry")
                        .contentType("text/html")
                        .payload("""
                                <h1>Crispy Sesame Tofu & Broccoli Stir Fry</h1>
                                <p>Tofu pressed for 20 mins, cubed into 1-inch squares, coated in arrowroot starch and pan fried in sesame oil until golden brown. Tossed with steamed broccoli florets, tamari sauce, maple syrup, minced ginger, and garlic. Garnish with toasted sesame seeds and green onions.</p>
                                """)
                        .metadata(Map.of("author", "Dana Shultz", "tags", List.of("vegan", "gluten-free", "quick-dinner")))
                        .status("PENDING")
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                RawIngestPayload.builder()
                        .source("CLIPBOARD")
                        .sourceUrl(null)
                        .contentType("text/plain")
                        .payload("Grandma's lentil soup: 2 cups brown lentils, 1 yellow onion diced, 2 carrots diced, 2 celery stalks chopped, 6 cups vegetable broth, 1 bay leaf, 1 tsp cumin. Sauté aromatics in olive oil, add rinsed lentils and broth. Simmer for 40 minutes. Squeeze fresh lemon juice right before serving.")
                        .metadata(Map.of("pastedFrom", "Notes App", "starred", true))
                        .status("PENDING")
                        .createdAt(now)
                        .updatedAt(now)
                        .build(),

                RawIngestPayload.builder()
                        .source("JSON_IMPORT")
                        .sourceUrl("https://api.spoonacular.com/recipes/extract")
                        .contentType("application/json")
                        .payload("""
                                {
                                  "recipeId": 894102,
                                  "title": "Avocado Lime Crema Dressing",
                                  "servings": 4,
                                  "extendedIngredients": [
                                    {"name": "hass avocado", "amount": 1.0, "unit": "whole"},
                                    {"name": "lime juice", "amount": 2.0, "unit": "tbsp"},
                                    {"name": "cilantro", "amount": 0.25, "unit": "cup"},
                                    {"name": "greek yogurt", "amount": 0.5, "unit": "cup"}
                                  ]
                                }
                                """)
                        .metadata(Map.of("externalProvider", "Spoonacular", "version", "1.2"))
                        .status("PROCESSED")
                        .createdAt(now)
                        .updatedAt(now)
                        .build()
        );

        rawIngestPayloadRepository.saveAll(payloads);
        return payloads.size();
    }
}
