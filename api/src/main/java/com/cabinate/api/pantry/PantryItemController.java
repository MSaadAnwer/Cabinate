package com.cabinate.api.pantry;

import java.time.LocalDate;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.cabinate.api.pantry.dto.CreatePantryItemRequest;
import com.cabinate.api.pantry.dto.PantryItemResponse;
import com.cabinate.api.pantry.dto.UpdatePantryItemRequest;
import lombok.RequiredArgsConstructor;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1/pantry")
@RequiredArgsConstructor
public class PantryItemController {

    private final PantryItemService pantryItemService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PantryItemResponse createItem(@Valid @RequestBody CreatePantryItemRequest request) {
        return pantryItemService.createItem(request);
    }

    @GetMapping
    public List<PantryItemResponse> getAllItems(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        return pantryItemService.getAllItems(category, search);
    }

    @GetMapping("/expiring")
    public List<PantryItemResponse> getExpiringItems(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate before) {
        return pantryItemService.getExpiringItems(before);
    }

    @GetMapping("/{id}")
    public PantryItemResponse getItemById(@PathVariable String id) {
        return pantryItemService.getItemById(id);
    }

    @PutMapping("/{id}")
    public PantryItemResponse updateItem(
            @PathVariable String id,
            @Valid @RequestBody UpdatePantryItemRequest request) {
        return pantryItemService.updateItem(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@PathVariable String id) {
        pantryItemService.deleteItem(id);
    }
}
