package com.cabinate.api.receipt;

import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.cabinate.api.common.security.AccountContext;
import com.cabinate.api.pantry.PantryItemRepository;
import static com.cabinate.api.receipt.ReceiptContracts.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReceiptServiceTest {
    private final ReceiptDraftRepository drafts = mock(ReceiptDraftRepository.class);
    private final PantryItemRepository pantry = mock(PantryItemRepository.class);
    private final ReceiptProvider provider = mock(ReceiptProvider.class);
    private final AccountContext account = mock(AccountContext.class);
    private final ReceiptService service = new ReceiptService(drafts, pantry, provider, account);
    @BeforeEach void scope() { when(account.id()).thenReturn("account-a"); }

    static ReceiptProvider.Line line(String source, String name, Double quantity, Kind kind, Confidence confidence) {
        return new ReceiptProvider.Line(source, name, quantity, "pack", "PANTRY", "CABINET", kind, confidence);
    }
    static ReceiptDraft draft() {
        return ReceiptDraft.builder().id("receipt").ownerId("account-a").version(0L).status(Status.READY)
                .items(List.of(new Item("line-a", "Rice", "Rice", 1.0, "pack", "GRAINS", "CABINET", Kind.FOOD, Confidence.HIGH),
                        new Item("line-b", "Unknown", "Unknown", null, "pack", "OTHER", "CABINET", Kind.UNKNOWN, Confidence.LOW)))
                .confirmedItems(List.of()).importedItems(List.of()).build();
    }
    static ConfirmItem selected(String line, String name, double quantity) {
        return new ConfirmItem(line, name, quantity, "pack", "GRAINS", "CABINET", null, true);
    }

    @Test void extractionSavesOnlyOwnerScopedReviewDataAndNeverMutatesPantry() {
        when(provider.extract(any())).thenReturn(BedrockReceiptProviderTest.extraction());
        when(drafts.insert(any(ReceiptDraft.class))).thenAnswer(call -> {
            ReceiptDraft draft = call.getArgument(0);
            assertEquals("account-a", draft.getOwnerId());
            assertNotNull(draft.getSourceHash());
            draft.setId("draft"); draft.setVersion(0L);
            return draft;
        });
        var result = service.extract(new ExtractRequest(null, null, "Rice 1.99"));
        assertEquals(Status.READY, result.status());
        assertEquals(2, result.items().size());
        assertTrue(result.confirmedItems().isEmpty());
        verifyNoInteractions(pantry);
    }

    @Test void repeatedExactInputReusesDraftAndSkipsProvider() {
        var request = new ExtractRequest(null, null, "Rice 1 pack");
        var input = ReceiptImage.validate(request);
        when(drafts.findByOwnerIdAndSourceHash("account-a", input.sourceHash())).thenReturn(Optional.of(draft()));
        assertEquals("receipt", service.extract(request).id());
        verifyNoInteractions(provider, pantry);
        verify(drafts, never()).insert(any(ReceiptDraft.class));
    }

    @Test void correctsObviousNonFoodAndOmitsAdministrativeLinesDespiteProviderLabels() {
        var extraction = new ReceiptProvider.Extraction(null, null, List.of(
                line("PAPER TOWELS 4.99", "Paper towels", 1.0, Kind.FOOD, Confidence.HIGH),
                line("DOG FOOD 12.99", "Dog food", 1.0, Kind.FOOD, Confidence.HIGH),
                line("BAKING SODA 1.29", "Baking soda", 1.0, Kind.FOOD, Confidence.HIGH),
                line("TOTAL 20.00", "Total", 20.0, Kind.FOOD, Confidence.HIGH),
                line("TAX 1.00", "Tax", 1.0, Kind.FOOD, Confidence.HIGH),
                line("DEPOSIT 0.05", "Deposit", 1.0, Kind.FOOD, Confidence.HIGH),
                line("ABC", "ABC", null, Kind.UNKNOWN, Confidence.HIGH)));
        var items = ReceiptService.reviewItems(extraction);
        assertEquals(4, items.size());
        assertEquals(List.of(Kind.NON_FOOD, Kind.NON_FOOD, Kind.FOOD, Kind.UNKNOWN), items.stream().map(Item::kind).toList());
        assertEquals(Confidence.LOW, items.getLast().confidence());
        assertEquals("PAPER TOWELS 4.99", items.getFirst().sourceText());
    }

    @Test void invalidQuantitiesBecomeUncertainAndMalformedResultsFailSafely() {
        var items = ReceiptService.reviewItems(new ReceiptProvider.Extraction(null, null, List.of(
                line("Rice", "Rice", Double.POSITIVE_INFINITY, Kind.FOOD, Confidence.HIGH))));
        assertNull(items.getFirst().quantity());
        assertEquals(Confidence.LOW, items.getFirst().confidence());
        assertThrows(ReceiptException.class, () -> ReceiptService.reviewItems(null));
        assertThrows(ReceiptException.class, () -> ReceiptService.reviewItems(new ReceiptProvider.Extraction(null, null, Arrays.asList((ReceiptProvider.Line) null))));
        assertEquals(422, assertThrows(ReceiptException.class,
                () -> ReceiptService.reviewItems(new ReceiptProvider.Extraction(null, null, List.of()))).status().value());
    }

    @Test void rejectsForeignDraftsAndUnsafeSelectionsBeforeWrites() {
        assertThrows(com.cabinate.api.common.exception.ResourceNotFoundException.class, () -> service.get("foreign"));
        assertThrows(com.cabinate.api.common.exception.ResourceNotFoundException.class,
                () -> service.confirm("foreign", new ConfirmRequest(0L, List.of(selected("line-a", "Rice", 1)))));
        when(drafts.findByIdAndOwnerId("receipt", "account-a")).thenReturn(Optional.of(draft()));
        for (var selection : List.of(List.of(selected("forged", "Rice", 1)),
                List.of(selected("line-a", "Rice", 0)), List.of(selected("line-a", "Rice", Double.NaN)),
                List.of(selected("line-a", "Rice", 1), selected("line-a", "Rice", 1)),
                List.of(new ConfirmItem("line-a", "Rice", 1.0, "pack", "GRAINS", "CABINET", null, false)))) {
            assertEquals(400, assertThrows(ReceiptException.class, () -> service.confirm("receipt", new ConfirmRequest(0L, selection))).status().value());
        }
        verify(drafts, never()).save(any());
        verifyNoInteractions(pantry);
    }

    @Test void capsConcurrentExtractionAndReleasesSlotsAfterProviderFailure() throws Exception {
        var started = new CountDownLatch(2);
        var release = new CountDownLatch(1);
        when(provider.extract(any())).thenAnswer(call -> {
            started.countDown();
            if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Test timeout");
            throw new ReceiptException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Unavailable");
        });
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.extract(new ExtractRequest(null, null, "Receipt one")));
            var second = executor.submit(() -> service.extract(new ExtractRequest(null, null, "Receipt two")));
            try {
                assertTrue(started.await(5, TimeUnit.SECONDS));
                assertEquals(429, assertThrows(ReceiptException.class,
                        () -> service.extract(new ExtractRequest(null, null, "Receipt three"))).status().value());
            } finally { release.countDown(); }
            assertThrows(ExecutionException.class, () -> first.get(5, TimeUnit.SECONDS));
            assertThrows(ExecutionException.class, () -> second.get(5, TimeUnit.SECONDS));
        }
        assertEquals(503, assertThrows(ReceiptException.class,
                () -> service.extract(new ExtractRequest(null, null, "Receipt four"))).status().value());
        verify(provider, times(3)).extract(any());
        verifyNoInteractions(pantry);
    }
}
