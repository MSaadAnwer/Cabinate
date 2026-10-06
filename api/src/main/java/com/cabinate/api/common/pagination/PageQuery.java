package com.cabinate.api.common.pagination;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** Shared binding and limits for all collection APIs; sort is controlled by the server. */
public record PageQuery(@Min(0) Integer page, @Min(1) @Max(100) Integer size) {
    public PageQuery {
        page = page == null ? 0 : page;
        size = size == null ? 25 : size;
    }

    public PageRequest sortedBy(Sort sort) {
        return PageRequest.of(page, size, sort.and(Sort.by("id")));
    }
}
