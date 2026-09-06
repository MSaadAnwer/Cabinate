package com.cabinate.api.pantry;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.cabinate.api.common.exception.ResourceNotFoundException;
import com.cabinate.api.pantry.dto.CreatePantryItemRequest;
import com.cabinate.api.pantry.dto.PantryItemResponse;
import com.cabinate.api.pantry.dto.UpdatePantryItemRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PantryItemServiceTest {

    @Mock
    private PantryItemRepository pantryItemRepository;

    @InjectMocks
    private PantryItemService pantryItemService;

    private PantryItem sampleItem;

    @BeforeEach
    void setUp() {
        sampleItem = PantryItem.builder()
                .id("pantry-1")
                .name("Oat Milk")
                .quantity(1.5)
                .unit("liters")
                .category("DAIRY")
                .location("FRIDGE")
                .expirationDate(LocalDate.now().plusDays(5))
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void createItem_ShouldPersistAndReturnResponse() {
        CreatePantryItemRequest request = new CreatePantryItemRequest(
                "Oat Milk", 1.5, "liters", "DAIRY", "FRIDGE", LocalDate.now().plusDays(5));

        when(pantryItemRepository.save(any(PantryItem.class))).thenAnswer(invocation -> {
            PantryItem item = invocation.getArgument(0);
            item.setId("pantry-1");
            return item;
        });

        PantryItemResponse response = pantryItemService.createItem(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo("pantry-1");
        assertThat(response.name()).isEqualTo("Oat Milk");
        assertThat(response.quantity()).isEqualTo(1.5);
        assertThat(response.createdAt()).isNotNull();

        ArgumentCaptor<PantryItem> captor = ArgumentCaptor.forClass(PantryItem.class);
        verify(pantryItemRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Oat Milk");
    }

    @Test
    void getItemById_WhenFound_ShouldReturnResponse() {
        when(pantryItemRepository.findById("pantry-1")).thenReturn(Optional.of(sampleItem));

        PantryItemResponse response = pantryItemService.getItemById("pantry-1");

        assertThat(response.id()).isEqualTo("pantry-1");
        assertThat(response.name()).isEqualTo("Oat Milk");
    }

    @Test
    void getItemById_WhenNotFound_ShouldThrowException() {
        when(pantryItemRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pantryItemService.getItemById("missing"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("PantryItem not found with id: 'missing'");
    }

    @Test
    void getAllItems_WithoutFilters_ShouldReturnAll() {
        when(pantryItemRepository.findAll()).thenReturn(List.of(sampleItem));

        List<PantryItemResponse> items = pantryItemService.getAllItems(null, null);

        assertThat(items).hasSize(1);
        verify(pantryItemRepository).findAll();
    }

    @Test
    void getAllItems_WithCategoryAndSearch_ShouldQueryCombined() {
        when(pantryItemRepository.findByCategoryIgnoreCaseAndNameContainingIgnoreCase("DAIRY", "milk"))
                .thenReturn(List.of(sampleItem));

        List<PantryItemResponse> items = pantryItemService.getAllItems("DAIRY", "milk");

        assertThat(items).hasSize(1);
        verify(pantryItemRepository).findByCategoryIgnoreCaseAndNameContainingIgnoreCase("DAIRY", "milk");
    }

    @Test
    void getAllItems_WithCategoryOnly_ShouldQueryCategory() {
        when(pantryItemRepository.findByCategoryIgnoreCase("DAIRY")).thenReturn(List.of(sampleItem));

        List<PantryItemResponse> items = pantryItemService.getAllItems("DAIRY", null);

        assertThat(items).hasSize(1);
        verify(pantryItemRepository).findByCategoryIgnoreCase("DAIRY");
    }

    @Test
    void getAllItems_WithSearchOnly_ShouldQueryName() {
        when(pantryItemRepository.findByNameContainingIgnoreCase("milk")).thenReturn(List.of(sampleItem));

        List<PantryItemResponse> items = pantryItemService.getAllItems(null, "milk");

        assertThat(items).hasSize(1);
        verify(pantryItemRepository).findByNameContainingIgnoreCase("milk");
    }

    @Test
    void getExpiringItems_ShouldQueryRepositoryWithDate() {
        LocalDate date = LocalDate.now().plusDays(3);
        when(pantryItemRepository.findByExpirationDateBeforeOrderByExpirationDateAsc(date))
                .thenReturn(List.of(sampleItem));

        List<PantryItemResponse> expiring = pantryItemService.getExpiringItems(date);

        assertThat(expiring).hasSize(1);
        verify(pantryItemRepository).findByExpirationDateBeforeOrderByExpirationDateAsc(date);
    }

    @Test
    void updateItem_WhenFound_ShouldUpdateAndReturnResponse() {
        UpdatePantryItemRequest updateReq = new UpdatePantryItemRequest(
                "Organic Oat Milk", 2.0, "liters", "DAIRY", "FRIDGE", LocalDate.now().plusDays(10));

        when(pantryItemRepository.findById("pantry-1")).thenReturn(Optional.of(sampleItem));
        when(pantryItemRepository.save(any(PantryItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PantryItemResponse response = pantryItemService.updateItem("pantry-1", updateReq);

        assertThat(response.name()).isEqualTo("Organic Oat Milk");
        assertThat(response.quantity()).isEqualTo(2.0);
        verify(pantryItemRepository).save(sampleItem);
    }

    @Test
    void updateItem_WhenNotFound_ShouldThrowException() {
        UpdatePantryItemRequest updateReq = new UpdatePantryItemRequest(
                "Organic Oat Milk", 2.0, "liters", "DAIRY", "FRIDGE", null);

        when(pantryItemRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pantryItemService.updateItem("missing", updateReq))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(pantryItemRepository, never()).save(any());
    }

    @Test
    void deleteItem_WhenFound_ShouldDelete() {
        when(pantryItemRepository.existsById("pantry-1")).thenReturn(true);

        pantryItemService.deleteItem("pantry-1");

        verify(pantryItemRepository).deleteById("pantry-1");
    }

    @Test
    void deleteItem_WhenNotFound_ShouldThrowException() {
        when(pantryItemRepository.existsById("missing")).thenReturn(false);

        assertThatThrownBy(() -> pantryItemService.deleteItem("missing"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(pantryItemRepository, never()).deleteById(any());
    }
}
