package com.cabinate.api.common.security;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("account_link_challenges")
public record AccountLinkChallenge(@Id String id, String challengeId, String subject, String clientId,
        String primaryNonce, String secondaryNonce, @Indexed(expireAfter = "0s") Instant expiresAt) {}
