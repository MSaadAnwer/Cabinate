package com.cabinate.api.receipt;

import java.time.LocalDate;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import com.cabinate.api.pantry.dto.PantryItemResponse;

public final class ReceiptContracts {
    private ReceiptContracts() {}

    public enum Kind { FOOD, NON_FOOD, UNKNOWN }
    public enum Confidence { HIGH, LOW }
    public enum Status { READY, IMPORTING, IMPORTED }

    public record ExtractRequest(
            @Size(max = 5_000_000) String imageBase64,
            @Size(max = 40) String mediaType,
            @Size(max = 30_000) String text) {}

    public record Item(String id, String sourceText, String name, Double quantity, String unit,
            String category, String location, Kind kind, Confidence confidence) {}

    public record ConfirmItem(
            @NotBlank @Size(max = 100) String lineId,
            @NotBlank @Size(max = 120) String name,
            @NotNull @Positive Double quantity,
            @NotBlank @Size(max = 40) String unit,
            @NotBlank @Size(max = 40) String category,
            @NotBlank @Size(max = 40) String location,
            LocalDate expirationDate,
            @NotNull @AssertTrue(message = "Confirm that each selected item is food") Boolean foodConfirmed) {}

    public record ConfirmRequest(@NotNull @Min(0) Long version,
            @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid ConfirmItem> items) {}

    public record DraftResponse(String id, Long version, String store, LocalDate purchaseDate, List<Item> items,
            Status status, List<ConfirmItem> confirmedItems, Long confirmationVersion,
            List<PantryItemResponse> importedItems) {
        static DraftResponse from(ReceiptDraft draft) {
            return new DraftResponse(draft.getId(), draft.getVersion(), draft.getStore(), draft.getPurchaseDate(),
                    draft.getItems(), draft.getStatus(), draft.getConfirmedItems(), draft.getConfirmationVersion(),
                    draft.getImportedItems());
        }
    }

    public record ConfirmResponse(String receiptId, List<PantryItemResponse> items) {}
}
