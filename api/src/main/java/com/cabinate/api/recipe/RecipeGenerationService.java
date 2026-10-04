package com.cabinate.api.recipe;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.Semaphore;
import org.springframework.stereotype.Service;
import com.cabinate.api.pantry.PantryItem;
import com.cabinate.api.pantry.PantryItemRepository;
import com.cabinate.api.recipe.dto.GeneratedRecipeResponse;
import static com.cabinate.api.recipe.RecipeGenerationException.Reason.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeGenerationService {
    private final PantryItemRepository pantryRepository;
    private final RecipeIdeaProvider provider;
    private final Semaphore slots = new Semaphore(2);

    public List<GeneratedRecipeResponse> generate(List<String> excludeTitles) {
        if (!slots.tryAcquire()) throw new RecipeGenerationException(BUSY,
                "Recipe generation is busy. Please try again in a moment.");
        try {
            var pantry = pantryRepository.findAll().stream()
                    .filter(item -> item.getId() != null && item.getName() != null && !item.getName().isBlank())
                    .filter(item -> item.getQuantity() != null && Double.isFinite(item.getQuantity()) && item.getQuantity() > 0)
                    .filter(item -> item.getExpirationDate() == null || !item.getExpirationDate().isBefore(LocalDate.now()))
                    .sorted(Comparator.comparing(PantryItem::getExpirationDate, Comparator.nullsLast(Comparator.naturalOrder())))
                    .limit(100)
                    .map(item -> new RecipeIdeaProvider.Stock(item.getId(), item.getName(), item.getQuantity(),
                            item.getUnit() == null ? "" : item.getUnit(),
                            item.getExpirationDate() == null ? "" : item.getExpirationDate().toString()))
                    .toList();
            if (pantry.isEmpty()) throw new RecipeGenerationException(EMPTY_PANTRY,
                    "Add some in-stock, unexpired ingredients to your pantry first, then try again.");
            return validate(provider.generate(pantry, excludeTitles), pantry, excludeTitles);
        } finally {
            slots.release();
        }
    }

    static List<GeneratedRecipeResponse> validate(List<RecipeIdeaProvider.Idea> ideas,
            List<RecipeIdeaProvider.Stock> pantry, List<String> excludeTitles) {
        if (ideas == null || ideas.size() < 3) {
            log.warn("Recipe validation failed: expected three suggestions, received {}", ideas == null ? 0 : ideas.size());
            throw invalid();
        }
        Map<String, RecipeIdeaProvider.Stock> stock = new HashMap<>();
        pantry.forEach(item -> stock.put(item.id(), item));
        Set<String> titles = new HashSet<>();
        excludeTitles.forEach(title -> titles.add(normalize(title)));
        Set<String> instructions = new HashSet<>();
        List<GeneratedRecipeResponse> result = new ArrayList<>();
        for (var idea : ideas.subList(0, 3)) {
            if (idea == null || !text(idea.title(), 120) || !text(idea.description(), 1000)
                    || !titles.add(normalize(idea.title())) || idea.servings() < 1 || idea.servings() > 20
                    || idea.prepTimeMinutes() < 0 || idea.prepTimeMinutes() > 1440
                    || idea.cookTimeMinutes() < 0 || idea.cookTimeMinutes() > 1440
                    || idea.steps() == null || idea.steps().isEmpty() || idea.steps().size() > 20
                    || idea.steps().stream().anyMatch(step -> !text(step, 2000))
                    || !instructions.add(normalize(String.join(" ", idea.steps())))
                    || idea.ingredients() == null || idea.ingredients().isEmpty() || idea.ingredients().size() > 30) {
                log.warn("Recipe validation failed: invalid fields or repeated recipe at index {}", result.size());
                throw invalid();
            }
            List<String> ingredients = new ArrayList<>();
            Set<String> used = new HashSet<>();
            for (var ingredient : idea.ingredients()) {
                if (ingredient == null) throw invalid();
                var item = stock.get(ingredient.pantryItemId());
                boolean duplicate = item != null && !used.add(item.id());
                if (item == null || duplicate || !Double.isFinite(ingredient.quantity())
                        || ingredient.quantity() <= 0 || ingredient.quantity() > item.quantity()) {
                    log.warn("Recipe ingredient validation failed: knownItem={}, quantity={}, stock={}, duplicate={}",
                            item != null, ingredient.quantity(), item == null ? null : item.quantity(),
                            duplicate);
                    throw invalid();
                }
                String quantity = BigDecimal.valueOf(ingredient.quantity()).stripTrailingZeros().toPlainString();
                ingredients.add((quantity + " " + item.unit()).strip() + " " + item.name());
            }
            result.add(new GeneratedRecipeResponse(idea.title().strip(), idea.description().strip(),
                    ingredients, idea.steps(), idea.prepTimeMinutes(), idea.cookTimeMinutes(), idea.servings()));
        }
        return result;
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").strip();
    }
    private static boolean text(String value, int max) { return value != null && !value.isBlank() && value.length() <= max; }
    static RecipeGenerationException invalid() {
        return new RecipeGenerationException(INVALID_RESPONSE,
                "Could not create three fresh recipes from your pantry. Try again or add more ingredients for variety.");
    }
}
