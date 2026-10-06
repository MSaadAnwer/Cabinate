package com.cabinate.api.common.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** OIDC subjects are unique within an issuer, not across identity providers. */
public final class AccountId {
    private AccountId() {}
    public static String of(String issuer, String subject) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest((issuer + "\0" + subject).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException("SHA-256 is unavailable", ex); }
    }
}
