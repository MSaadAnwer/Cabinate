package com.cabinate.api.pantry;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PantryItemRepository extends MongoRepository<PantryItem, String> {

    List<PantryItem> findByNameContainingIgnoreCase(String name);

    List<PantryItem> findByCategoryIgnoreCase(String category);

    List<PantryItem> findByCategoryIgnoreCaseAndNameContainingIgnoreCase(String category, String name);

    List<PantryItem> findByExpirationDateLessThanEqualOrderByExpirationDateAsc(LocalDate date);
}
