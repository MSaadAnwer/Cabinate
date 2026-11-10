package com.cabinate.api.common.security;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import com.cabinate.api.common.http.ExternalHttpClient;
import tools.jackson.databind.json.JsonMapper;

/** Self-service Auth0 linking. Proofs and privileged tokens are never persisted or logged. */
@Service
@Profile("!dev")
public class AccountLinkService {
    private static final Set<String> PROVIDERS = Set.of("google-oauth2", "apple", "auth0");
    private final MongoTemplate mongo;
    private final ExternalHttpClient http;
    private final JsonMapper mapper;
    private final String issuer;
    private final JwtDecoder proofs;

    @org.springframework.beans.factory.annotation.Autowired
    public AccountLinkService(MongoTemplate mongo, ExternalHttpClient http, JsonMapper mapper,
            @Value("${cabinate.auth.issuer:}") String issuer) {
        this(mongo, http, mapper, issuer, new SupplierJwtDecoder(() -> {
            var decoder = NimbusJwtDecoder.withIssuerLocation(issuer).build();
            decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
            return decoder;
        }));
    }
    AccountLinkService(MongoTemplate mongo, ExternalHttpClient http, JsonMapper mapper, String issuer, JwtDecoder proofs) {
        this.mongo = mongo; this.http = http; this.mapper = mapper; this.issuer = issuer; this.proofs = proofs;
    }
    public record Status(List<String> providers) {}
    public record Preview(String accountId, String provider, String email) {}

    private Jwt current() {
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken auth)) throw invalid();
        Jwt jwt = auth.getToken();
        if (!issuer.startsWith("https://") || !AccountContext.validId(jwt.getSubject())
                || jwt.getClaimAsString("azp") == null || jwt.getClaimAsString("azp").isBlank()) throw invalid();
        return jwt;
    }
    private String owner(Jwt jwt) { return AccountId.of(issuer, jwt.getSubject()); }
    public Status status() {
        Jwt jwt = current();
        var stored = mongo.findById(owner(jwt), LinkRecord.class);
        return new Status(stored == null ? List.of(provider(jwt.getSubject())) : stored.providers());
    }
    public AccountLinkChallenge begin() {
        Jwt jwt = current();
        var challenge = new AccountLinkChallenge(owner(jwt), UUID.randomUUID().toString(), jwt.getSubject(),
                jwt.getClaimAsString("azp"), UUID.randomUUID().toString(), UUID.randomUUID().toString(), Instant.now().plusSeconds(600));
        return mongo.save(challenge);
    }
    private record Verified(AccountLinkChallenge challenge, Jwt secondary, String owner) {}
    private Verified verify(AccountLinkController.Proof body) {
        Jwt jwt = current();
        var challenge = mongo.findById(owner(jwt), AccountLinkChallenge.class);
        if (challenge == null || !challenge.challengeId().equals(body.challengeId())
                || !challenge.subject().equals(jwt.getSubject()) || !challenge.clientId().equals(jwt.getClaimAsString("azp"))
                || challenge.expiresAt().isBefore(Instant.now())) throw invalid();
        try {
            Jwt primary = proofs.decode(body.primaryIdToken());
            Jwt secondary = proofs.decode(body.secondaryIdToken());
            validateId(primary, challenge.primaryNonce(), challenge.clientId());
            validateId(secondary, challenge.secondaryNonce(), challenge.clientId());
            if (!jwt.getSubject().equals(primary.getSubject())) throw invalid();
            Jwt management = proofs.decode(body.managementAccessToken());
            String managementAudience = issuer.replaceAll("/+$", "") + "/api/v2/";
            if (management.getExpiresAt() == null || management.getIssuedAt() == null
                    || management.getAudience() == null || !management.getAudience().contains(managementAudience)
                    || !jwt.getSubject().equals(management.getSubject())
                    || !challenge.clientId().equals(management.getClaimAsString("azp"))
                    || !Arrays.asList(Optional.ofNullable(management.getClaimAsString("scope")).orElse("").split(" "))
                        .contains("update:current_user_identities")) throw invalid();
            if (primary.getSubject().equals(secondary.getSubject()))
                throw new AccountLinkException(HttpStatus.CONFLICT, "That login already opens this Cabinate account.");
            provider(secondary.getSubject());
            return new Verified(challenge, secondary, owner(jwt));
        } catch (JwtException | IllegalArgumentException ex) { throw invalid(); }
    }
    private void validateId(Jwt jwt, String nonce, String clientId) {
        Object authTime = jwt.getClaims().get("auth_time");
        Instant now = Instant.now();
        long seconds = authTime instanceof Instant time ? time.getEpochSecond() : authTime instanceof Number n ? n.longValue() : 0;
        if (jwt.getExpiresAt() == null || jwt.getIssuedAt() == null || !List.of(clientId).equals(jwt.getAudience()) || !nonce.equals(jwt.getClaimAsString("nonce"))
                || !AccountContext.validId(jwt.getSubject()) || !Boolean.TRUE.equals(jwt.getClaims().get("email_verified"))
                || seconds < now.minusSeconds(600).getEpochSecond() || seconds > now.plusSeconds(60).getEpochSecond()) throw invalid();
    }
    public Preview preview(AccountLinkController.Proof body) {
        var verified = verify(body);
        ensureEmpty(verified.secondary());
        return new Preview(AccountId.of(issuer, verified.secondary().getSubject()), provider(verified.secondary().getSubject()), verified.secondary().getClaimAsString("email"));
    }
    private void ensureEmpty(Jwt secondary) {
        String accountId = AccountId.of(issuer, secondary.getSubject());
        for (String collection : List.of("pantry_items", "recipes", "raw_ingest_payloads", "receipt_drafts")) {
            if (mongo.exists(Query.query(Criteria.where("ownerId").is(accountId)), collection))
                throw new AccountLinkException(HttpStatus.CONFLICT,
                        "The other login already has Cabinate data. Linking was stopped to keep that kitchen safe. Sign into the kitchen you want to keep; combining two populated kitchens needs a separate data merge.");
        }
        if (mongo.exists(Query.query(Criteria.where("_id").is(accountId)), LinkRecord.class))
            throw new AccountLinkException(HttpStatus.CONFLICT, "The other login already belongs to a linked account.");
    }
    public Status complete(AccountLinkController.Proof body) {
        var verified = verify(body);
        ensureEmpty(verified.secondary());
        // Atomically consume the exact challenge; concurrent requests and replays cannot link twice.
        var consumed = mongo.findAndRemove(Query.query(Criteria.where("_id").is(verified.owner())
                .and("challengeId").is(body.challengeId()).and("expiresAt").gt(Instant.now())), AccountLinkChallenge.class);
        if (consumed == null) throw invalid();
        try {
            String path = issuer.replaceAll("/+$", "") + "/api/v2/users/"
                    + URLEncoder.encode(consumed.subject(), StandardCharsets.UTF_8) + "/identities";
            var request = HttpRequest.newBuilder(URI.create(path)).timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + body.managementAccessToken()).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(Map.of("link_with", body.secondaryIdToken())))).build();
            var response = http.send(request, 100_000);
            if (response.statusCode() != 201 && response.statusCode() != 200)
                throw new AccountLinkException(HttpStatus.BAD_GATEWAY, "Auth0 could not link these logins. Your Auth0 plan and application must allow account linking. No Cabinate data was merged.");
            var providers = new LinkedHashSet<String>();
            providers.add(provider(consumed.subject()));
            providers.add(provider(verified.secondary().getSubject()));
            for (var identity : mapper.readTree(response.body())) {
                String name = identity.path("provider").asText();
                if (PROVIDERS.contains(name)) providers.add(name);
            }
            var result = new Status(List.copyOf(providers));
            mongo.save(new LinkRecord(verified.owner(), result.providers()));
            return result;
        } catch (AccountLinkException ex) { throw ex; }
        catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw uncertain(); }
        catch (Exception ex) { throw uncertain(); }
    }
    @org.springframework.data.mongodb.core.mapping.Document("account_links")
    public record LinkRecord(@org.springframework.data.annotation.Id String id, List<String> providers) {}
    static String provider(String subject) {
        String provider = subject.split("\\|", 2)[0];
        if (!PROVIDERS.contains(provider)) throw invalid();
        return provider;
    }
    static AccountLinkException invalid() { return new AccountLinkException(HttpStatus.BAD_REQUEST, "Could not verify both logins. Please start account linking again and sign into each account."); }
    static AccountLinkException uncertain() { return new AccountLinkException(HttpStatus.BAD_GATEWAY, "Could not confirm account linking. Your kitchen is unchanged. Sign out and check each login before trying again."); }
}
