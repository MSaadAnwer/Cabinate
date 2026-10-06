package com.cabinate.api.common.security;

import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** The configured issuer's stable subject owns data; clients cannot select another account. */
@Component
public class AccountContext {
    public static final String DEMO_ACCOUNT = "local-demo";
    private final boolean development;
    public AccountContext(Environment environment) {
        this.development = environment.acceptsProfiles(Profiles.of("dev"));
    }
    public String id() {
        if (development) return DEMO_ACCOUNT;
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken token && token.isAuthenticated()) {
            String subject = token.getToken().getSubject();
            if (validId(subject) && token.getToken().getIssuer() != null)
                return AccountId.of(token.getToken().getIssuer().toString(), subject);
        }
        throw new AccessDeniedException("A verified account is required");
    }
    public String subject() {
        if (development) return "local-developer";
        id();
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
    public static boolean validId(String id) { return id != null && !id.isBlank() && id.length() <= 255; }
}
