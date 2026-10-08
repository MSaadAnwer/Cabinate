package com.cabinate.api.receipt;

import org.springframework.http.HttpStatus;

/** Messages are written by the application, never copied from provider responses. */
public class ReceiptException extends RuntimeException {
    private final HttpStatus status;
    public ReceiptException(HttpStatus status, String message) { super(message); this.status = status; }
    public HttpStatus status() { return status; }
    static ReceiptException invalidResponse() {
        return new ReceiptException(HttpStatus.BAD_GATEWAY, "The receipt could not be read reliably. Try a clearer photo or enter the items manually.");
    }
}
