package com.cabinate.api.common.pagination;

import java.util.List;
import org.springframework.data.domain.Page;

/** API-owned envelope, independent of Spring Data's internal Page serialization. */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
