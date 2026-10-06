package com.cabinate.api.common.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AccountContext account;
    private final boolean development;
    private final boolean configured;

    public AuthController(AccountContext account, Environment environment,
            @Value("${cabinate.auth.issuer:}") String issuer, @Value("${cabinate.auth.audience:}") String audience) {
        this.account = account;
        this.development = environment.acceptsProfiles(Profiles.of("dev"));
        this.configured = !issuer.isBlank() && !audience.isBlank();
    }
    public record Configuration(String mode, boolean configured) {}
    public record Identity(String subject, String accountId) {}
    @GetMapping("/config") public Configuration configuration() {
        return new Configuration(development ? "development" : "oidc", development || configured);
    }
    @GetMapping("/me") public Identity me() { return new Identity(account.subject(), account.id()); }
}
