package com.cabinate.api.recipe;

public class RecipeGenerationException extends RuntimeException {
    public enum Reason { EMPTY_PANTRY, UNAVAILABLE, BUSY, INVALID_RESPONSE }
    private final Reason reason;

    public RecipeGenerationException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason reason() { return reason; }
}
