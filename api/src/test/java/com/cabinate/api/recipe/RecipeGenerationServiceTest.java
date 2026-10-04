package com.cabinate.api.recipe;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.cabinate.api.pantry.PantryItem;
import com.cabinate.api.pantry.PantryItemRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RecipeGenerationServiceTest {
    private final PantryItemRepository pantry = mock(PantryItemRepository.class);
    private final RecipeIdeaProvider provider = mock(RecipeIdeaProvider.class);
    private final RecipeGenerationService service = new RecipeGenerationService(pantry, provider);
    private static final RecipeIdeaProvider.Stock STOCK = new RecipeIdeaProvider.Stock("egg", "Eggs", 6, "pcs", "");

    static RecipeIdeaProvider.Idea idea(String title, String id, double quantity) {
        return new RecipeIdeaProvider.Idea(title, "A pantry meal", List.of(new RecipeIdeaProvider.Ingredient(id, quantity)),
                List.of("Prepare " + title, "Cook until set."), 5, 10, 2);
    }
    static List<RecipeIdeaProvider.Idea> ideas() {
        return List.of(idea("Scrambled eggs", "egg", 2), idea("Poached eggs", "egg", 2), idea("Boiled eggs", "egg", 2));
    }

    @Test void returnsThreeWithoutSavingOrConsumingInventory() {
        when(pantry.findAll()).thenReturn(List.of(PantryItem.builder().id("egg").name("Eggs").quantity(6.0).unit("pcs").build()));
        when(provider.generate(List.of(STOCK), List.of("Omelette"))).thenReturn(ideas());
        var recipes = service.generate(List.of("Omelette"));
        assertEquals(3, recipes.size());
        assertEquals(List.of("2 pcs Eggs"), recipes.getFirst().ingredients());
        verify(pantry).findAll();
        verifyNoMoreInteractions(pantry);
    }

    @Test void filtersExpiredAndDepletedStockAndPrioritizesSoonestExpiry() {
        var soon = PantryItem.builder().id("egg").name("Eggs").quantity(6.0).unit("pcs").expirationDate(LocalDate.now()).build();
        var expired = PantryItem.builder().id("old").name("Old food").quantity(1.0).expirationDate(LocalDate.now().minusDays(1)).build();
        var depleted = PantryItem.builder().id("empty").name("Rice").quantity(0.0).build();
        var later = PantryItem.builder().id("rice").name("Rice").quantity(1.0).unit("kg").build();
        when(pantry.findAll()).thenReturn(List.of(later, expired, depleted, soon));
        when(provider.generate(anyList(), anyList())).thenAnswer(call -> {
            List<RecipeIdeaProvider.Stock> stock = call.getArgument(0);
            assertEquals(List.of("egg", "rice"), stock.stream().map(RecipeIdeaProvider.Stock::id).toList());
            return ideas();
        });
        assertEquals(3, service.generate(List.of()).size());
    }

    @Test void emptyPantryDoesNotCallProviderAndReleasesCapacity() {
        when(pantry.findAll()).thenReturn(List.of());
        for (int i = 0; i < 4; i++) {
            var error = assertThrows(RecipeGenerationException.class, () -> service.generate(List.of()));
            assertEquals(RecipeGenerationException.Reason.EMPTY_PANTRY, error.reason());
        }
        verifyNoInteractions(provider);
    }

    @Test void selectsExactlyThreeWhenModelReturnsExtraSuggestions() {
        var extra = new java.util.ArrayList<>(ideas());
        extra.add(idea("Omelette", "egg", 2));
        var result = RecipeGenerationService.validate(extra, List.of(STOCK), List.of());
        assertEquals(3, result.size());
        assertEquals("Scrambled eggs", result.getFirst().title());
    }

    @Test void rejectsMissingDuplicateAndPreviouslyShownRecipes() {
        assertThrows(RecipeGenerationException.class, () -> RecipeGenerationService.validate(ideas().subList(0, 2), List.of(STOCK), List.of()));
        assertThrows(RecipeGenerationException.class, () -> RecipeGenerationService.validate(
                List.of(ideas().getFirst(), ideas().getFirst(), ideas().getLast()), List.of(STOCK), List.of()));
        assertThrows(RecipeGenerationException.class, () -> RecipeGenerationService.validate(ideas(), List.of(STOCK), List.of("SCRAMBLED EGGS!")));
    }

    @Test void rejectsHallucinatedIngredientsAndInsufficientQuantities() {
        for (var invalid : List.of(idea("Toast", "bread", 1), idea("Too many", "egg", 7),
                idea("Negative", "egg", -1), idea("Invalid", "egg", Double.NaN))) {
            assertThrows(RecipeGenerationException.class, () -> RecipeGenerationService.validate(
                    List.of(invalid, ideas().get(1), ideas().get(2)), List.of(STOCK), List.of()));
        }
    }
}
