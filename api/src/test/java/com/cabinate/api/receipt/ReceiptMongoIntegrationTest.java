package com.cabinate.api.receipt;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoClient;
import com.cabinate.api.common.security.AccountContext;
import com.cabinate.api.pantry.PantryItem;
import com.cabinate.api.pantry.PantryItemRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.repository.support.MongoRepositoryFactory;
import static com.cabinate.api.receipt.ReceiptContracts.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.AdditionalAnswers.delegatesTo;

/** Standalone MongoDB: only newly created random test databases are written and removed. */
@EnabledIfEnvironmentVariable(named = "CABINATE_TEST_MONGODB_URI", matches = ".+")
class ReceiptMongoIntegrationTest {
    private final String database = "cabinate_access_test_receipts_" + UUID.randomUUID().toString().replace("-", "");
    private MongoClient client;
    private ReceiptDraftRepository drafts;
    private PantryItemRepository pantry;
    private final ReceiptProvider provider = mock(ReceiptProvider.class);
    private final AccountContext account = mock(AccountContext.class);
    private ReceiptService service;

    @BeforeEach void setup() {
        client = MongoClients.create(System.getenv("CABINATE_TEST_MONGODB_URI"));
        var template = new MongoTemplate(client, database);
        template.indexOps(ReceiptDraft.class).ensureIndex(new Index().on("ownerId", Sort.Direction.ASC)
                .on("sourceHash", Sort.Direction.ASC).unique().named("receipt_owner_source"));
        var factory = new MongoRepositoryFactory(template);
        drafts = factory.getRepository(ReceiptDraftRepository.class);
        pantry = factory.getRepository(PantryItemRepository.class);
        when(account.id()).thenReturn("account-a");
        when(provider.extract(any())).thenReturn(BedrockReceiptProviderTest.extraction());
        service = new ReceiptService(drafts, pantry, provider, account);
    }
    @AfterEach void cleanup() {
        if (client != null) {
            if (!database.startsWith("cabinate_access_test_receipts_")) throw new IllegalStateException("Unsafe database");
            client.getDatabase(database).drop(); client.close();
        }
    }
    private DraftResponse extract() { return service.extract(new ExtractRequest(null, null, "Rice 1.99; Unknown 2.49")); }
    private ConfirmRequest select(DraftResponse draft, boolean includeUnknown) {
        var items = new ArrayList<ConfirmItem>();
        items.add(ReceiptServiceTest.selected(draft.items().getFirst().id(), "Brown rice", 2));
        if (includeUnknown) items.add(ReceiptServiceTest.selected(draft.items().getLast().id(), "Confirmed beans", 1));
        return new ConfirmRequest(draft.version(), items);
    }

    @Test void extractionHasNoPantryWritesAndConfirmationImportsOnlySelectedReviewedRows() {
        var draft = extract();
        assertEquals(0L, pantry.count());
        assertEquals(0L, draft.version());
        var result = service.confirm(draft.id(), select(draft, false));
        assertEquals(1, result.items().size());
        assertEquals("Brown rice", result.items().getFirst().name());
        assertEquals(2.0, result.items().getFirst().quantity());
        assertEquals(0L, result.items().getFirst().version());
        assertEquals(1L, pantry.countByOwnerId("account-a"));
        var imported = service.get(draft.id());
        assertEquals(Status.IMPORTED, imported.status());
        assertEquals(2L, imported.version());
        assertEquals(0L, imported.confirmationVersion());
        assertEquals(1, imported.confirmedItems().size());
        when(account.id()).thenReturn("account-b");
        assertThrows(com.cabinate.api.common.exception.ResourceNotFoundException.class, () -> service.get(draft.id()));
        assertThrows(com.cabinate.api.common.exception.ResourceNotFoundException.class, () -> service.confirm(draft.id(), select(draft, false)));
    }

    @Test void identicalReplayReturnsDurableResultAfterPantryEditOrDeletionWithoutResurrection() {
        var draft = extract();
        var request = select(draft, true);
        var result = service.confirm(draft.id(), request);
        var first = pantry.findByIdAndOwnerId(result.items().getFirst().id(), "account-a").orElseThrow();
        first.setQuantity(99.0); pantry.save(first);
        pantry.deleteById(result.items().getLast().id());
        assertEquals(result, service.confirm(draft.id(), request));
        assertEquals(1L, pantry.count());
        assertEquals(99.0, pantry.findById(first.getId()).orElseThrow().getQuantity());
        assertEquals(409, assertThrows(ReceiptException.class,
                () -> service.confirm(draft.id(), select(draft, false))).status().value());
        assertEquals(draft.id(), extract().id());
        verify(provider, times(1)).extract(any());
    }

    @Test void partialInsertCanResumeSameImmutableSelectionWithOriginalVersion() {
        var draft = extract();
        var request = select(draft, true);
        var failing = mock(PantryItemRepository.class, delegatesTo(pantry));
        var calls = new AtomicInteger();
        doAnswer(call -> {
            if (calls.incrementAndGet() == 2) throw new DataAccessResourceFailureException("Simulated outage");
            return pantry.insert((PantryItem) call.getArgument(0));
        }).when(failing).insert(any(PantryItem.class));
        var firstAttempt = new ReceiptService(drafts, failing, provider, account);
        assertThrows(DataAccessResourceFailureException.class, () -> firstAttempt.confirm(draft.id(), request));
        assertEquals(1L, pantry.count());
        var pending = service.get(draft.id());
        assertEquals(Status.IMPORTING, pending.status());
        assertEquals(1L, pending.version());
        assertEquals(0L, pending.confirmationVersion());
        assertEquals(2, pending.confirmedItems().size());
        assertEquals(409, assertThrows(ReceiptException.class,
                () -> service.confirm(draft.id(), select(draft, false))).status().value());
        assertEquals(1L, pantry.count());
        var result = service.confirm(draft.id(), request);
        assertEquals(2, result.items().size());
        assertEquals(2L, pantry.count());
        assertEquals(result, service.confirm(draft.id(), request));
    }

    @Test void lostInsertAcknowledgementAndFailedFinalSaveAreRecoverable() {
        var draft = extract();
        var request = select(draft, false);
        var failingPantry = mock(PantryItemRepository.class, delegatesTo(pantry));
        doAnswer(call -> {
            pantry.insert((PantryItem) call.getArgument(0));
            throw new DataAccessResourceFailureException("Acknowledgement lost");
        }).when(failingPantry).insert(any(PantryItem.class));
        assertThrows(DataAccessResourceFailureException.class,
                () -> new ReceiptService(drafts, failingPantry, provider, account).confirm(draft.id(), request));
        assertEquals(1L, pantry.count());
        var failingDrafts = mock(ReceiptDraftRepository.class, delegatesTo(drafts));
        doAnswer(call -> { throw new DataAccessResourceFailureException("Final status write failed"); }).when(failingDrafts).save(any(ReceiptDraft.class));
        assertThrows(DataAccessResourceFailureException.class,
                () -> new ReceiptService(failingDrafts, pantry, provider, account).confirm(draft.id(), request));
        assertEquals(Status.IMPORTING, service.get(draft.id()).status());
        assertEquals(1, service.confirm(draft.id(), request).items().size());
        assertEquals(1L, pantry.count());
    }

    @Test void concurrentIdenticalConfirmationsConvergeAndStaleReadyVersionCannotWrite() throws Exception {
        var draft = extract();
        var request = select(draft, true);
        assertThrows(OptimisticLockingFailureException.class,
                () -> service.confirm(draft.id(), new ConfirmRequest(9L, request.items())));
        assertEquals(0L, pantry.count());
        var synchronizedReads = mock(ReceiptDraftRepository.class, delegatesTo(drafts));
        var ready = new CountDownLatch(2);
        var reads = new AtomicInteger();
        doAnswer(call -> {
            var snapshot = drafts.findByIdAndOwnerId(call.getArgument(0), "account-a");
            if (reads.incrementAndGet() <= 2) {
                ready.countDown();
                if (!ready.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrent test timeout");
            }
            return snapshot;
        }).when(synchronizedReads).findByIdAndOwnerId(anyString(), eq("account-a"));
        var concurrent = new ReceiptService(synchronizedReads, pantry, provider, account);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> concurrent.confirm(draft.id(), request));
            var second = executor.submit(() -> concurrent.confirm(draft.id().toUpperCase(Locale.ROOT), request));
            assertEquals(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        }
        assertEquals(2L, pantry.count());
        assertEquals(Status.IMPORTED, service.get(draft.id()).status());
    }

    @Test void concurrentExtractionUsesUniqueOwnerSourceAndOtherAccountsRemainSeparate() throws Exception {
        var ready = new CountDownLatch(2);
        when(provider.extract(any())).thenAnswer(call -> {
            ready.countDown();
            if (!ready.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrent test timeout");
            return BedrockReceiptProviderTest.extraction();
        });
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(this::extract);
            var second = executor.submit(this::extract);
            assertEquals(first.get(10, TimeUnit.SECONDS).id(), second.get(10, TimeUnit.SECONDS).id());
        }
        assertEquals(1L, drafts.count());
        when(account.id()).thenReturn("account-b");
        extract();
        assertEquals(2L, drafts.count());
        assertEquals(0L, pantry.count());
    }
}
