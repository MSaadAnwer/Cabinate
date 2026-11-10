package com.cabinate.api.common.security;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import com.cabinate.api.common.http.ExternalHttpClient;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AccountLinkServiceTest {
    private static final String ISSUER = "https://tenant.us.auth0.com/";
    private static final String SUBJECT = "google-oauth2|primary";
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final ExternalHttpClient http = mock(ExternalHttpClient.class);
    private final JwtDecoder decoder = mock(JwtDecoder.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final AccountLinkService service = new AccountLinkService(mongo, http, mapper, ISSUER, decoder);
    private AccountLinkChallenge challenge;
    private final AccountLinkController.Proof proof = new AccountLinkController.Proof("challenge", "primary-id", "secondary-id", "management");

    Jwt.Builder jwt(String subject, String audience) {
        return Jwt.withTokenValue("opaque").header("alg", "RS256").issuer(ISSUER).subject(subject)
                .audience(List.of(audience)).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300));
    }
    Jwt id(String subject, String nonce) {
        return jwt(subject, "client").claim("nonce", nonce).claim("auth_time", Instant.now())
                .claim("email_verified", true).claim("email", "user@example.test").build();
    }
    @BeforeEach void setup() {
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt(SUBJECT, "cabinate-api").claim("azp", "client").build()));
        challenge = new AccountLinkChallenge(AccountId.of(ISSUER, SUBJECT), "challenge", SUBJECT, "client", "primary-nonce", "secondary-nonce", Instant.now().plusSeconds(600));
        when(mongo.findById(challenge.id(), AccountLinkChallenge.class)).thenReturn(challenge);
        when(decoder.decode("primary-id")).thenReturn(id(SUBJECT, "primary-nonce"));
        when(decoder.decode("secondary-id")).thenReturn(id("apple|secondary", "secondary-nonce"));
        when(decoder.decode("management")).thenReturn(jwt(SUBJECT, ISSUER + "api/v2/").claim("azp", "client")
                .claim("scope", "openid update:current_user_identities").build());
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    @Test void previewRevealsOnlyTheProvenSecondaryAccountAndDoesNotLink() throws Exception {
        var result = service.preview(proof);
        assertEquals(AccountId.of(ISSUER, "apple|secondary"), result.accountId());
        assertEquals("apple", result.provider());
        verifyNoInteractions(http);
        verify(mongo, never()).findAndRemove(any(Query.class), eq(AccountLinkChallenge.class));
    }
    @Test void rejectsWrongNonceAudienceAndUnverifiedEmailBeforeCallingProvider() {
        for (var invalid : List.of(id("apple|secondary", "wrong"),
                jwt("apple|secondary", "another-client").claim("nonce", "secondary-nonce").build(),
                jwt("apple|secondary", "client").claim("nonce", "secondary-nonce").claim("auth_time", Instant.now()).claim("email_verified", false).build())) {
            when(decoder.decode("secondary-id")).thenReturn(invalid);
            assertThrows(AccountLinkException.class, () -> service.complete(proof));
        }
        verifyNoInteractions(http);
    }
    @Test void rejectsPrimaryMismatchOldAuthenticationAndWrongManagementScope() {
        when(decoder.decode("primary-id")).thenReturn(id("google-oauth2|someone-else", "primary-nonce"));
        assertThrows(AccountLinkException.class, () -> service.preview(proof));
        when(decoder.decode("primary-id")).thenReturn(id(SUBJECT, "primary-nonce"));
        when(decoder.decode("secondary-id")).thenReturn(jwt("apple|secondary", "client").claim("nonce", "secondary-nonce")
                .claim("auth_time", Instant.now().minusSeconds(900)).claim("email_verified", true).build());
        assertThrows(AccountLinkException.class, () -> service.preview(proof));
        when(decoder.decode("secondary-id")).thenReturn(id("apple|secondary", "secondary-nonce"));
        when(decoder.decode("management")).thenReturn(jwt(SUBJECT, ISSUER + "api/v2/").claim("azp", "client").claim("scope", "update:users").build());
        assertThrows(AccountLinkException.class, () -> service.preview(proof));
        verifyNoInteractions(http);
    }
    @Test void rejectsExpiredOrReplacedChallengesAndAlreadyLinkedIdentity() {
        when(mongo.findById(challenge.id(), AccountLinkChallenge.class)).thenReturn(new AccountLinkChallenge(challenge.id(), "challenge", SUBJECT, "client", "primary-nonce", "secondary-nonce", Instant.now().minusSeconds(1)));
        assertThrows(AccountLinkException.class, () -> service.preview(proof));
        when(mongo.findById(challenge.id(), AccountLinkChallenge.class)).thenReturn(challenge);
        when(decoder.decode("secondary-id")).thenReturn(id(SUBJECT, "secondary-nonce"));
        assertThrows(AccountLinkException.class, () -> service.preview(proof));
        verifyNoInteractions(http);
    }
    @Test void refusesPopulatedSecondaryKitchenWithoutConsumingChallenge() {
        when(mongo.exists(any(Query.class), eq("pantry_items"))).thenReturn(true);
        var error = assertThrows(AccountLinkException.class, () -> service.complete(proof));
        assertEquals(409, error.status().value());
        verifyNoInteractions(http);
        verify(mongo, never()).findAndRemove(any(Query.class), eq(AccountLinkChallenge.class));
    }
    @Test void atomicConsumptionPreventsReplay() {
        when(mongo.findAndRemove(any(Query.class), eq(AccountLinkChallenge.class))).thenReturn(null);
        assertThrows(AccountLinkException.class, () -> service.complete(proof));
        verifyNoInteractions(http);
    }
    @Test @SuppressWarnings("unchecked") void linksOnlyProvenAccountsAndKeepsPrimaryOwnership() throws Exception {
        when(mongo.findAndRemove(any(Query.class), eq(AccountLinkChallenge.class))).thenReturn(challenge);
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(201);
        when(response.body()).thenReturn("[{\"provider\":\"google-oauth2\"},{\"provider\":\"apple\"}]".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        when(http.send(any(HttpRequest.class), anyInt())).thenAnswer(call -> {
            HttpRequest request = call.getArgument(0);
            assertEquals(ISSUER + "api/v2/users/google-oauth2%7Cprimary/identities", request.uri().toString());
            assertEquals("Bearer management", request.headers().firstValue("Authorization").orElseThrow());
            return response;
        });
        assertEquals(List.of("google-oauth2", "apple"), service.complete(proof).providers());
        verify(mongo).save(new AccountLinkService.LinkRecord(challenge.id(), List.of("google-oauth2", "apple")));
        verify(mongo, never()).updateMulti(any(Query.class), any(org.springframework.data.mongodb.core.query.Update.class), anyString());
    }
    @Test @SuppressWarnings("unchecked") void providerRejectionDoesNotPublishALink() throws Exception {
        when(mongo.findAndRemove(any(Query.class), eq(AccountLinkChallenge.class))).thenReturn(challenge);
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(403);
        when(http.send(any(HttpRequest.class), anyInt())).thenReturn(response);
        var error = assertThrows(AccountLinkException.class, () -> service.complete(proof));
        assertEquals(502, error.status().value());
        verify(mongo, never()).save(any(AccountLinkService.LinkRecord.class));
    }
}
