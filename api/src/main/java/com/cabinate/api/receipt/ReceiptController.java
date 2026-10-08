package com.cabinate.api.receipt;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import static com.cabinate.api.receipt.ReceiptContracts.*;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/receipts")
@RequiredArgsConstructor
public class ReceiptController {
    private final ReceiptService service;

    @PostMapping("/extract")
    @ResponseStatus(HttpStatus.CREATED)
    public DraftResponse extract(@Valid @RequestBody ExtractRequest request) { return service.extract(request); }

    @GetMapping("/{id}")
    public DraftResponse get(@PathVariable String id) { return service.get(id); }

    @PostMapping("/{id}/confirm")
    public ConfirmResponse confirm(@PathVariable String id, @Valid @RequestBody ConfirmRequest request) {
        return service.confirm(id, request);
    }
}
