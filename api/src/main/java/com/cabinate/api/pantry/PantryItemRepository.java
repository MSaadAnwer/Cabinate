package com.cabinate.api.pantry;

import java.util.Optional;
import java.util.List;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PantryItemRepository extends MongoRepository<PantryItem, String> {
    Page<PantryItem> findByOwnerId(String ownerId, Pageable pageable);
    List<PantryItem> findByOwnerId(String ownerId);
    Optional<PantryItem> findByIdAndOwnerId(String id, String ownerId);
    List<PantryItem> findByOwnerIdAndExpirationDateLessThanEqualOrderByExpirationDateAsc(String ownerId, LocalDate date);
    Page<PantryItem> findByOwnerIdAndNameContainingIgnoreCase(String ownerId, String name, Pageable pageable);
    Page<PantryItem> findByOwnerIdAndCategoryIgnoreCase(String ownerId, String category, Pageable pageable);
    Page<PantryItem> findByOwnerIdAndCategoryIgnoreCaseAndNameContainingIgnoreCase(String ownerId, String category, String name, Pageable pageable);
    long countByOwnerId(String ownerId);
    void deleteByOwnerId(String ownerId);
}
