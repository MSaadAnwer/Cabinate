package com.cabinate.api.common.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import com.cabinate.api.recipe.RecipeGenerationException;
import com.cabinate.api.receipt.ReceiptException;
import com.cabinate.api.receipt.ReceiptUploadFilter;
import lombok.extern.slf4j.Slf4j;

/** Preserves the client error contract and Spring's HTTP statuses and headers. */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(ReceiptException.class)
    public ResponseEntity<ErrorResponse> handleReceipt(ReceiptException ex, HttpServletRequest request) {
        return error(ex.status(), ex.getMessage(), request);
    }
    @ExceptionHandler(RecipeGenerationException.class)
    public ResponseEntity<ErrorResponse> handleRecipeGeneration(
            RecipeGenerationException ex, HttpServletRequest request) {
        HttpStatus status = switch (ex.reason()) {
            case EMPTY_PANTRY -> HttpStatus.UNPROCESSABLE_ENTITY;
            case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case BUSY -> HttpStatus.TOO_MANY_REQUESTS;
            case INVALID_RESPONSE -> HttpStatus.BAD_GATEWAY;
        };
        String message = ex.getMessage();
        if (ex.reason() == RecipeGenerationException.Reason.UNAVAILABLE) {
            log.warn("Recipe generation unavailable [{}]: {}", request.getRequestURI(), ex.getMessage());
            message = "Recipe suggestions are unavailable right now. Please try again later.";
        }
        return error(status, message, request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(field ->
                fields.putIfAbsent(field.getField(), field.getDefaultMessage()));
        return new ResponseEntity<>(ErrorResponse.ofValidation(status.value(), reason(status),
                "Validation failed for one or more fields", path(request), fields), headers, status);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof ReceiptUploadFilter.LimitExceeded)
                return new ResponseEntity<>(ErrorResponse.of(413, "Payload Too Large",
                        "Receipt upload is too large. Resize the photo and try again.", path(request)), headers, HttpStatus.PAYLOAD_TOO_LARGE);
        }
        return new ResponseEntity<>(ErrorResponse.of(status.value(), reason(status),
                "Malformed JSON request or invalid data format.", path(request)), headers, status);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String message = "Invalid request parameter format.";
        if (ex instanceof MethodArgumentTypeMismatchException argument) {
            String type = argument.getRequiredType() == null ? "specified type" : argument.getRequiredType().getSimpleName();
            message = "Parameter '%s' should be of type '%s'".formatted(argument.getName(), type);
        }
        return new ResponseEntity<>(ErrorResponse.of(status.value(), reason(status), message, path(request)), headers, status);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        // Framework errors include unsupported methods/media types and binding failures.
        String message = status.is5xxServerError()
                ? "Something went wrong. Please try again later." : reason(status);
        if (status.is5xxServerError()) log.error("Framework failure processing [{}]", path(request), ex);
        return super.handleExceptionInternal(ex,
                ErrorResponse.of(status.value(), reason(status), message, path(request)), headers, status, request);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleConflict(OptimisticLockingFailureException ex, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, "This record changed. Refresh it and try again.", request);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDatabaseFailure(DataAccessException ex, HttpServletRequest request) {
        log.error("Database failure processing [{}]", request.getRequestURI(), ex);
        return error(HttpStatus.SERVICE_UNAVAILABLE, "Your data is temporarily unavailable. Please try again later.", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleDenied(AccessDeniedException ex, HttpServletRequest request) {
        return error(HttpStatus.FORBIDDEN, "You do not have access to this action.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception processing [{}]", request.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong. Please try again later.", request);
    }

    private static ResponseEntity<ErrorResponse> error(HttpStatus status, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(ErrorResponse.of(
                status.value(), status.getReasonPhrase(), message, request.getRequestURI()));
    }

    private static String reason(HttpStatusCode status) {
        HttpStatus known = HttpStatus.resolve(status.value());
        return known == null ? "Request failed" : known.getReasonPhrase();
    }

    private static String path(WebRequest request) {
        return ((ServletWebRequest) request).getRequest().getRequestURI();
    }
}
