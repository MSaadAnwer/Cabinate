package com.cabinate.api.common.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!dev")
@RequestMapping("/api/v1/auth/links")
public class AccountLinkController {
    private final AccountLinkService service;
    public AccountLinkController(AccountLinkService service) { this.service = service; }
    public record Proof(@NotBlank @Size(max = 100) String challengeId,
            @NotBlank @Size(max = 20000) String primaryIdToken,
            @NotBlank @Size(max = 20000) String secondaryIdToken,
            @NotBlank @Size(max = 20000) String managementAccessToken) {}
    public record Challenge(String challengeId, String primaryNonce, String secondaryNonce) {}
    @GetMapping public AccountLinkService.Status status() { return service.status(); }
    @PostMapping("/challenge") public Challenge begin() {
        var challenge = service.begin();
        return new Challenge(challenge.challengeId(), challenge.primaryNonce(), challenge.secondaryNonce());
    }
    @PostMapping("/preview") public AccountLinkService.Preview preview(@Valid @RequestBody Proof body) { return service.preview(body); }
    @PostMapping public AccountLinkService.Status complete(@Valid @RequestBody Proof body) { return service.complete(body); }
}
