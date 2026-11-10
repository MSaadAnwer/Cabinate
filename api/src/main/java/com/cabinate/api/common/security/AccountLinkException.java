package com.cabinate.api.common.security;

import org.springframework.http.HttpStatus;

public class AccountLinkException extends RuntimeException {
    private final HttpStatus status;
    public AccountLinkException(HttpStatus status, String message) { super(message); this.status = status; }
    public HttpStatus status() { return status; }
}
