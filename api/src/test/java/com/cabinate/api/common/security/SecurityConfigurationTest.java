package com.cabinate.api.common.security;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.time.Instant;
import java.util.List;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import com.cabinate.api.common.config.WebConfiguration;
import tools.jackson.databind.json.JsonMapper;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SecurityConfigurationTest {
    private static final String ISSUER = "https://issuer.example";
    private static final KeyPair KEYS = keys();
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private static KeyPair keys() {
        try { var generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048); return generator.generateKeyPair(); }
        catch (Exception ex) { throw new IllegalStateException(ex); }
    }

    @RestController static class Probe {
        private final AccountContext account;
        Probe(AccountContext account) { this.account = account; }
        @GetMapping("/api/v1/pantry") String read() { return account.id(); }
        @PostMapping("/api/v1/pantry") String write() { return account.id(); }
    }
    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({SecurityConfiguration.class, WebConfiguration.class, AccountContext.class})
    static class TestConfig {
        @Bean JsonMapper mapper() { return JsonMapper.builder().build(); }
        @Bean Probe probe(AccountContext account) { return new Probe(account); }
        @Bean @Primary JwtDecoder signedDecoder() {
            var decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEYS.getPublic()).build();
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(ISSUER),
                    new AccountTokenValidator("cabinate-api")));
            return decoder;
        }
    }
    @BeforeEach void setup() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(TestConfig.class);
        context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    @AfterEach void close() { context.close(); }

    private String token(String issuer, String audience, String account, String scope, Instant expiration, KeyPair keys) {
        var jwk = new RSAKey.Builder((RSAPublicKey) keys.getPublic()).privateKey((RSAPrivateKey) keys.getPrivate()).keyID("test").build();
        var encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwk)));
        var claims = JwtClaimsSet.builder().issuer(issuer).audience(List.of(audience))
                .issuedAt(Instant.now().minusSeconds(600)).expiresAt(expiration).claim("scope", scope);
        if (account != null) claims.subject(account);
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims.build())).getTokenValue();
    }
    private String valid(String scope) { return token(ISSUER, "cabinate-api", "account-a", scope, Instant.now().plusSeconds(600), KEYS); }

    @Test void rejectsAnonymousAndWrongClaimsAndSignaturesWithApiErrors() throws Exception {
        mvc.perform(get("/api/v1/pantry")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401)).andExpect(header().string("WWW-Authenticate", "Bearer"));
        for (String invalid : List.of(
                token("https://other.example", "cabinate-api", "account-a", "cabinate:read", Instant.now().plusSeconds(600), KEYS),
                token(ISSUER, "other-api", "account-a", "cabinate:read", Instant.now().plusSeconds(600), KEYS),
                token(ISSUER, "cabinate-api", null, "cabinate:read", Instant.now().plusSeconds(600), KEYS),
                token(ISSUER, "cabinate-api", "account-a", "cabinate:read", Instant.now().minusSeconds(120), KEYS),
                token(ISSUER, "cabinate-api", "account-a", "cabinate:read", Instant.now().plusSeconds(600), keys()))) {
            mvc.perform(get("/api/v1/pantry").header("Authorization", "Bearer " + invalid))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
        }
    }
    @Test void signedAccountOverridesSpoofedHeadersAndWriteRequiresScope() throws Exception {
        mvc.perform(get("/api/v1/pantry").header("Authorization", "Bearer " + valid("cabinate:read"))
                .header("X-Account-Id", "other-account").param("ownerId", "other-account"))
                .andExpect(status().isOk()).andExpect(content().string(AccountId.of(ISSUER, "account-a")));
        mvc.perform(post("/api/v1/pantry").header("Authorization", "Bearer " + valid("cabinate:read")))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.status").value(403));
        mvc.perform(post("/api/v1/pantry").header("Authorization", "Bearer " + valid("cabinate:write")))
                .andExpect(status().isOk());
    }
    @Test void corsPreflightWorksWithoutAuthenticationIncludingVersionHeaders() throws Exception {
        mvc.perform(options("/api/v1/pantry").header("Origin", "http://localhost:8082")
                .header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "Authorization,If-Match"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8082"));
    }
}
