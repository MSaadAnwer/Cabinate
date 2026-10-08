package com.cabinate.api.receipt;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import com.cabinate.api.pantry.dto.PantryItemResponse;
import static com.cabinate.api.receipt.ReceiptContracts.*;
import lombok.*;

/** Images are transient provider inputs; only review data and the immutable import are retained. */
@Document(collection = "receipt_drafts")
@CompoundIndex(name = "receipt_owner_source", def = "{'ownerId': 1, 'sourceHash': 1}", unique = true)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptDraft {
    @Id private String id;
    @Indexed private String ownerId;
    @Version private Long version;
    private String sourceHash;
    private String store;
    private LocalDate purchaseDate;
    private List<Item> items;
    private Status status;
    private List<ConfirmItem> confirmedItems;
    private Long confirmationVersion;
    private List<PantryItemResponse> importedItems;
    private Instant createdAt;
    private Instant updatedAt;
}
