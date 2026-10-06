package com.cabinate.api.common.security;

import java.io.IOException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import com.cabinate.api.common.exception.ErrorResponse;
import tools.jackson.databind.json.JsonMapper;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
public class SecurityConfiguration {
    @Bean
    @Profile("!dev")
    JwtDecoder jwtDecoder(@Value("${cabinate.auth.issuer:}") String issuer,
            @Value("${cabinate.auth.audience:}") String audience) {
        if (issuer.isBlank() || audience.isBlank()) {
            // An unconfigured installation remains closed; local use requires the explicit dev profile.
            return token -> { throw new BadJwtException("Authentication is not configured"); };
        }
        if (!issuer.startsWith("https://")) throw new IllegalArgumentException("OIDC issuer must use HTTPS");
        return new SupplierJwtDecoder(() -> {
            var decoder = NimbusJwtDecoder.withIssuerLocation(issuer).build();
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer),
                    new AccountTokenValidator(audience)));
            return decoder;
        });
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, Environment environment, JsonMapper mapper) throws Exception {
        boolean development = environment.acceptsProfiles(Profiles.of("dev"));
        http.cors(Customizer.withDefaults()).csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, ex) -> writeError(mapper, request, response, HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler((request, response, ex) -> writeError(mapper, request, response, HttpStatus.FORBIDDEN)));
        if (development) {
            http.authorizeHttpRequests(access -> access.anyRequest().permitAll());
        } else {
            http.authorizeHttpRequests(access -> access
                    .requestMatchers(HttpMethod.GET, "/api/v1/auth/config", "/api/v1/recalls").permitAll()
                    .requestMatchers("/error").permitAll()
                    .requestMatchers("/api/v1/seed/**", "/api/v1/seed").hasAuthority("SCOPE_cabinate:admin")
                    .requestMatchers("/api/v1/auth/me").authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/**").hasAuthority("SCOPE_cabinate:read")
                    .requestMatchers("/api/**").hasAuthority("SCOPE_cabinate:write")
                    .anyRequest().denyAll())
                    .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults())
                            .authenticationEntryPoint((request, response, ex) -> writeError(mapper, request, response, HttpStatus.UNAUTHORIZED))
                            .accessDeniedHandler((request, response, ex) -> writeError(mapper, request, response, HttpStatus.FORBIDDEN)));
        }
        return http.build();
    }

    private static void writeError(JsonMapper mapper, HttpServletRequest request,
            HttpServletResponse response, HttpStatus status) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        if (status == HttpStatus.UNAUTHORIZED) response.setHeader("WWW-Authenticate", "Bearer");
        String message = status == HttpStatus.UNAUTHORIZED ? "Sign in to access your account." : "You do not have access to this action.";
        response.getWriter().write(mapper.writeValueAsString(ErrorResponse.of(
                status.value(), status.getReasonPhrase(), message, request.getRequestURI())));
    }
}
