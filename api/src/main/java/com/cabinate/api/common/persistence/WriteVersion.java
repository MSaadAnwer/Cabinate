package com.cabinate.api.common.persistence;

import java.util.Objects;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class WriteVersion {
    private WriteVersion() {}

    public static void check(Long expected, Long actual) {
        if (expected == null || actual == null || !Objects.equals(expected, actual)) {
            throw new OptimisticLockingFailureException("The record version has changed");
        }
    }

    /** A delete must supply a strong, quoted numeric ETag for the version last read. */
    public static long parse(String header) {
        if (header == null) throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED);
        if (!header.matches("\"[0-9]+\"")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        try { return Long.parseLong(header.substring(1, header.length() - 1)); }
        catch (NumberFormatException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST); }
    }
}
