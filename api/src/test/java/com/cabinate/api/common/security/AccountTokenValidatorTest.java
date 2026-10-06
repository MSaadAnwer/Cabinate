package com.cabinate.api.common.security;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import static org.junit.jupiter.api.Assertions.*;

class AccountTokenValidatorTest {
    @Test void accountIdsAreStableAndSeparateTheSameSubjectAtDifferentIssuers() {
        assertEquals(AccountId.of("https://one.example", "user"), AccountId.of("https://one.example", "user"));
        assertNotEquals(AccountId.of("https://one.example", "user"), AccountId.of("https://two.example", "user"));
    }
    private final AccountTokenValidator validator = new AccountTokenValidator("cabinate-api");
    private Jwt.Builder base() {
        return Jwt.withTokenValue("token").header("alg", "RS256").issuer("https://issuer.example");
    }
    @Test void missingAndMalformedClaimsAreRejectedRatherThanThrowing() {
        assertTrue(validator.validate(base().subject("user").expiresAt(Instant.now().plusSeconds(60)).build()).hasErrors());
        assertTrue(validator.validate(base().audience(java.util.List.of("cabinate-api"))
                .claim("sub", 123).expiresAt(Instant.now().plusSeconds(60)).build()).hasErrors());
        assertTrue(validator.validate(base().subject("user").audience(java.util.List.of("cabinate-api")).build()).hasErrors());
    }
}
