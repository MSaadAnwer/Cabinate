package com.cabinate.api.pantry;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.pantry.dto.CreatePantryItemRequest;
import com.cabinate.api.pantry.dto.PantryItemResponse;
import com.cabinate.api.pantry.dto.UpdatePantryItemRequest;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PantryItemService {

    private final PantryItemRepository pantryItemRepository;

    public PantryItemResponse createItem(CreatePantryItemRequest request) {
        Instant now = Instant.now();
        PantryItem item = PantryItem.builder()
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
        return pantryItemRepository.findById(id)
                .map(PantryItemResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("PantryItem", "id", id));
    }

    public List<PantryItemResponse> getAllItems(String category, String search) {
        boolean hasCategory = category != null && !category.isBlank();
        boolean hasSearch = search != null && !search.isBlank();

        List<PantryItem> items;
        if (hasCategory && hasSearch) {
            items = pantryItemRepository.findByCategoryIgnoreCaseAndNameContainingIgnoreCase(
                    category.trim(), search.trim());
        } else if (hasCategory) {
            items = pantryItemRepository.findByCategoryIgnoreCase(category.trim());
        } else if (hasSearch) {
            items = pantryItemRepository.findByNameContainingIgnoreCase(search.trim());
        } else {
            items = pantryItemRepository.findAll();
        }

        return items.stream()
                .map(PantryItemResponse::fromEntity)
                .toList();
    }

    public List<PantryItemResponse> getExpiringItems(LocalDate beforeDate) {
        LocalDate threshold = (beforeDate != null) ? beforeDate : LocalDate.now().plusDays(7);
        return pantryItemRepository.findByExpirationDateBeforeOrderByExpirationDateAsc(threshold)
                .stream()
                .map(PantryItemResponse::fromEntity)
                .toList();
    }

    public PantryItemResponse updateItem(String id, UpdatePantryItemRequest request) {
        PantryItem existing = pantryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PantryItem", "id", id));

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

    public void deleteItem(String id) {
        if (!pantryItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("PantryItem", "id", id);
        }
        pantryItemRepository.deleteById(id);
    }
}
