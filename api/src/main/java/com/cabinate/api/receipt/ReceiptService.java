package com.cabinate.api.receipt;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.Semaphore;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.common.persistence.WriteVersion;
import com.cabinate.api.common.security.AccountContext;
import com.cabinate.api.pantry.PantryItem;
import com.cabinate.api.pantry.PantryItemRepository;
import com.cabinate.api.pantry.dto.PantryItemResponse;
import static com.cabinate.api.receipt.ReceiptContracts.*;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReceiptService {
    private static final Pattern NON_FOOD = Pattern.compile(
            "\\b(?:toilet paper|toilet tissue|paper towels?|towels? paper|detergent|bleach|soap|shampoo|conditioner|toothpaste|diapers?|trash bags?|garbage bags?|(?:pet|dog|cat) food|dishwasher tablets?|disinfectant)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern ADMINISTRATIVE = Pattern.compile(
            "^(?:sub\\s*total|total|sales\\s*tax|tax|deposit|bottle\\s*(?:fee|deposit)|bag\\s*fee|service\\s*fee|balance|cash|change|tender|payment|coupon|discount|savings|visa|mastercard|amex|debit|credit)(?:\\s*[:\\-]?\\s*[$€£]?\\s*[\\d.,%$€£\\s]+)?$",
            Pattern.CASE_INSENSITIVE);
    private final ReceiptDraftRepository drafts;
    private final PantryItemRepository pantry;
    private final ReceiptProvider provider;
    private final AccountContext account;
    private final Semaphore slots = new Semaphore(2);

    public DraftResponse extract(ExtractRequest request) {
        String owner = account.id();
        var input = ReceiptImage.validate(request);
        var existing = drafts.findByOwnerIdAndSourceHash(owner, input.sourceHash());
        if (existing.isPresent()) return DraftResponse.from(existing.get());
        if (!slots.tryAcquire()) throw new ReceiptException(HttpStatus.TOO_MANY_REQUESTS, "Receipt scanning is busy. Please try again in a moment.");
        try {
            var extraction = provider.extract(input);
            var items = reviewItems(extraction);
            LocalDate date = null;
            try { if (extraction.purchaseDate() != null && !extraction.purchaseDate().isBlank()) date = LocalDate.parse(extraction.purchaseDate()); }
            catch (java.time.DateTimeException ex) { throw ReceiptException.invalidResponse(); }
            if (extraction.store() != null && extraction.store().length() > 200) throw ReceiptException.invalidResponse();
            Instant now = now();
            var draft = ReceiptDraft.builder().ownerId(owner).sourceHash(input.sourceHash()).store(cleanOptional(extraction.store()))
                    .purchaseDate(date).items(items).status(Status.READY).confirmedItems(List.of()).importedItems(List.of())
                    .createdAt(now).updatedAt(now).build();
            try { return DraftResponse.from(drafts.insert(draft)); }
            catch (DuplicateKeyException race) {
                return DraftResponse.from(drafts.findByOwnerIdAndSourceHash(owner, input.sourceHash()).orElseThrow(() -> race));
            }
        } finally { slots.release(); }
    }

    public DraftResponse get(String id) { return DraftResponse.from(find(id, account.id())); }

    public ConfirmResponse confirm(String id, ConfirmRequest request) {
        String owner = account.id();
        var draft = find(id, owner);
        // MongoDB ObjectId URLs may differ in case; imports must use the stored canonical ID.
        id = draft.getId();
        var selected = confirmation(request, draft);
        if (draft.getStatus() == Status.READY) {
            WriteVersion.check(request.version(), draft.getVersion());
            draft.setConfirmedItems(selected);
            draft.setConfirmationVersion(request.version());
            draft.setStatus(Status.IMPORTING);
            draft.setUpdatedAt(now());
            try { draft = drafts.save(draft); }
            catch (OptimisticLockingFailureException race) { draft = find(id, owner); }
        }
        if (!selected.equals(draft.getConfirmedItems()))
            throw new ReceiptException(HttpStatus.CONFLICT, "This receipt already has a confirmed selection. Resume that import before making changes.");
        if (draft.getStatus() == Status.IMPORTED) return new ConfirmResponse(id, draft.getImportedItems());
        if (draft.getStatus() != Status.IMPORTING) throw new OptimisticLockingFailureException("Receipt state changed");

        List<PantryItemResponse> imported = new ArrayList<>();
        for (var item : draft.getConfirmedItems()) {
            String pantryId = pantryId(owner, id, item.lineId());
            var saved = pantry.findByIdAndOwnerId(pantryId, owner);
            if (saved.isEmpty()) {
                var entity = PantryItem.builder().id(pantryId).ownerId(owner).name(item.name()).quantity(item.quantity())
                        .unit(item.unit()).category(item.category()).location(item.location()).expirationDate(item.expirationDate())
                        .createdAt(draft.getUpdatedAt()).updatedAt(draft.getUpdatedAt()).build();
                try { saved = Optional.of(pantry.insert(entity)); }
                catch (DuplicateKeyException race) {
                    saved = pantry.findByIdAndOwnerId(pantryId, owner);
                    if (saved.isEmpty()) throw new OptimisticLockingFailureException("Receipt item ownership changed");
                }
            }
            imported.add(PantryItemResponse.fromEntity(saved.orElseThrow()));
        }
        draft.setImportedItems(List.copyOf(imported));
        draft.setStatus(Status.IMPORTED);
        draft.setUpdatedAt(now());
        try { draft = drafts.save(draft); }
        catch (OptimisticLockingFailureException race) {
            draft = find(id, owner);
            if (draft.getStatus() != Status.IMPORTED || !selected.equals(draft.getConfirmedItems())) throw race;
        }
        return new ConfirmResponse(id, draft.getImportedItems());
    }

    private ReceiptDraft find(String id, String owner) {
        return drafts.findByIdAndOwnerId(id, owner).orElseThrow(() -> new ResourceNotFoundException("Receipt", "id", id));
    }

    static String pantryId(String owner, String draft, String line) {
        return "receipt-" + UUID.nameUUIDFromBytes((owner + "\0" + draft + "\0" + line).getBytes(StandardCharsets.UTF_8));
    }

    private static List<ConfirmItem> confirmation(ConfirmRequest request, ReceiptDraft draft) {
        if (request.version() == null || request.version() < 0 || request.items() == null || request.items().isEmpty() || request.items().size() > 100)
            throw bad("Choose between 1 and 100 food items to import.");
        Set<String> known = new HashSet<>();
        draft.getItems().forEach(item -> known.add(item.id()));
        Set<String> seen = new HashSet<>();
        List<ConfirmItem> selected = new ArrayList<>();
        for (var item : request.items()) {
            if (item == null || !known.contains(item.lineId()) || !seen.add(item.lineId())) throw bad("Selected receipt lines are invalid or repeated.");
            if (!Boolean.TRUE.equals(item.foodConfirmed())) throw bad("Confirm that each selected item is food.");
            if (item.quantity() == null || !Double.isFinite(item.quantity()) || item.quantity() <= 0) throw bad("Enter a positive quantity for each selected item.");
            if (!text(item.name(), 120) || !text(item.unit(), 40) || !text(item.category(), 40) || !text(item.location(), 40))
                throw bad("Enter a name, unit, category and location for each selected item.");
            selected.add(new ConfirmItem(item.lineId(), item.name().strip(), item.quantity(), item.unit().strip(),
                    item.category().strip(), item.location().strip(), item.expirationDate(), true));
        }
        selected.sort(Comparator.comparing(ConfirmItem::lineId));
        return List.copyOf(selected);
    }

    static List<Item> reviewItems(ReceiptProvider.Extraction extraction) {
        if (extraction == null || extraction.items() == null || extraction.items().size() > 100) throw ReceiptException.invalidResponse();
        List<Item> items = new ArrayList<>();
        for (var line : extraction.items()) {
            if (line == null || !text(line.sourceText(), 1000) || !text(line.name(), 120) || !text(line.unit(), 40)
                    || !text(line.category(), 40) || !text(line.location(), 40) || line.kind() == null || line.confidence() == null)
                throw ReceiptException.invalidResponse();
            if (ADMINISTRATIVE.matcher(line.sourceText().strip()).matches() || ADMINISTRATIVE.matcher(line.name().strip()).matches()) continue;
            Double quantity = line.quantity();
            if (quantity != null && (!Double.isFinite(quantity) || quantity <= 0)) quantity = null;
            var kind = NON_FOOD.matcher(line.sourceText() + " " + line.name()).find() ? Kind.NON_FOOD : line.kind();
            var confidence = quantity == null ? Confidence.LOW : line.confidence();
            items.add(new Item(UUID.randomUUID().toString(), line.sourceText().strip(), line.name().strip(), quantity,
                    line.unit().strip(), line.category().strip(), line.location().strip(), kind, confidence));
        }
        if (items.isEmpty()) throw new ReceiptException(HttpStatus.UNPROCESSABLE_ENTITY, "No purchased items could be read. Try a clearer photo or enter the items manually.");
        return List.copyOf(items);
    }

    private static String cleanOptional(String value) { return value == null || value.isBlank() ? null : value.strip(); }
    private static Instant now() { return Instant.now().truncatedTo(ChronoUnit.MILLIS); }
    private static boolean text(String value, int max) { return value != null && !value.isBlank() && value.length() <= max; }
    private static ReceiptException bad(String message) { return new ReceiptException(HttpStatus.BAD_REQUEST, message); }
}
