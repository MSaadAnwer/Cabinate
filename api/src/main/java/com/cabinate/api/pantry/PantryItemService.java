package com.cabinate.api.pantry;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.cabinate.api.common.pagination.PageResponse;
import org.springframework.stereotype.Service;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.pantry.dto.CreatePantryItemRequest;
import com.cabinate.api.pantry.dto.PantryItemResponse;
import com.cabinate.api.pantry.dto.UpdatePantryItemRequest;
import lombok.RequiredArgsConstructor;
import com.cabinate.api.common.security.AccountContext;
import com.cabinate.api.common.persistence.WriteVersion;

@Service
@RequiredArgsConstructor
public class PantryItemService {

    private final PantryItemRepository pantryItemRepository;
    private final AccountContext account;

    public PantryItemResponse createItem(CreatePantryItemRequest request) {
        Instant now = Instant.now();
        PantryItem item = PantryItem.builder()
                .ownerId(account.id())
                .name(request.name())
                .quantity(request.quantity())
                .unit(request.unit())
                .category(request.category())
                .location(request.location())
                .expirationDate(request.expirationDate())
                .createdAt(now)
                .updatedAt(now)
                .build();

        PantryItem saved = pantryItemRepository.save(item);
        return PantryItemResponse.fromEntity(saved);
    }

    public PantryItemResponse getItemById(String id) {
        return pantryItemRepository.findByIdAndOwnerId(id, account.id())
                .map(PantryItemResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("PantryItem", "id", id));
    }

    public List<PantryItemResponse> getAllItems(String category, String search) {
        return getItemPage(category, search, Pageable.unpaged()).items();
    }

    public List<PantryItemResponse> getExpiringItems(LocalDate beforeDate) {
        LocalDate threshold = (beforeDate != null) ? beforeDate : LocalDate.now().plusDays(7);
        return pantryItemRepository.findByOwnerIdAndExpirationDateLessThanEqualOrderByExpirationDateAsc(account.id(), threshold)
                .stream()
                .map(PantryItemResponse::fromEntity)
                .toList();
    }

    public PageResponse<PantryItemResponse> getItemPage(String category, String search, Pageable pageable) {
        boolean hasCategory = category != null && !category.isBlank();
        boolean hasSearch = search != null && !search.isBlank();
        Page<PantryItem> page;
        if (hasCategory && hasSearch) {
            page = pantryItemRepository.findByOwnerIdAndCategoryIgnoreCaseAndNameContainingIgnoreCase(account.id(), category.trim(), search.trim(), pageable);
        } else if (hasCategory) {
            page = pantryItemRepository.findByOwnerIdAndCategoryIgnoreCase(account.id(), category.trim(), pageable);
        } else if (hasSearch) {
            page = pantryItemRepository.findByOwnerIdAndNameContainingIgnoreCase(account.id(), search.trim(), pageable);
        } else {
            page = pantryItemRepository.findByOwnerId(account.id(), pageable);
        }
        return PageResponse.from(page.map(PantryItemResponse::fromEntity));
    }

    public PantryItemResponse updateItem(String id, UpdatePantryItemRequest request) {
        PantryItem existing = pantryItemRepository.findByIdAndOwnerId(id, account.id())
                .orElseThrow(() -> new ResourceNotFoundException("PantryItem", "id", id));

        WriteVersion.check(request.version(), existing.getVersion());
        existing.setName(request.name());
        existing.setQuantity(request.quantity());
        existing.setUnit(request.unit());
        existing.setCategory(request.category());
        existing.setLocation(request.location());
        existing.setExpirationDate(request.expirationDate());
        existing.setUpdatedAt(Instant.now());

        PantryItem saved = pantryItemRepository.save(existing);
        return PantryItemResponse.fromEntity(saved);
    }

    public void deleteItem(String id, long version) {
        PantryItem existing = pantryItemRepository.findByIdAndOwnerId(id, account.id())
                .orElseThrow(() -> new ResourceNotFoundException("PantryItem", "id", id));
        WriteVersion.check(version, existing.getVersion());
        pantryItemRepository.delete(existing);
    }
}
