package com.cabinate.api.common.security;

import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.Jwt;

/** Complements signature/issuer/timestamp validation with API audience and stable subject checks. */
public record AccountTokenValidator(String audience) implements OAuth2TokenValidator<Jwt> {
    @Override public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Object subject = jwt.getClaims().get("sub");
        if (jwt.getAudience() == null || !jwt.getAudience().contains(audience)
                || !(subject instanceof String id) || !AccountContext.validId(id) || jwt.getExpiresAt() == null) {
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid access token claims", null));
        }
        return OAuth2TokenValidatorResult.success();
    }
}
