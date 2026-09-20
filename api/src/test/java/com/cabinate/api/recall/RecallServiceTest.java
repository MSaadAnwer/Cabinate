package com.cabinate.api.recall;

import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.jupiter.api.Assertions.*;

class RecallServiceTest {
    private static byte[] xml(String link) {
        return ("<rss><channel><item><title>Example &amp; food</title><link>" + link
            + "</link><description>Check lot</description><pubDate>Tue, 15 Sep 2026 16:31:00 EDT</pubDate>"
            + "</item></channel></rss>").getBytes(StandardCharsets.UTF_8);
    }
    private static final String LINK = "http://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/example";
    @Test void parsesOfficialDatesAndUpgradesLinks() throws Exception {
        var notice = RecallService.parse(xml(LINK)).getFirst();
        assertEquals("Example & food", notice.title());
        assertEquals("https" + LINK.substring(4), notice.url());
        assertEquals(Instant.parse("2026-09-15T20:31:00Z"), notice.publishedAt());
    }
    @Test void rejectsUnexpectedAndUnsafeFeeds() {
        assertThrows(Exception.class, () -> RecallService.parse(xml("https://evil.example/recall")));
        assertThrows(Exception.class, () -> RecallService.parse("<html/>".getBytes()));
        assertThrows(Exception.class, () -> RecallService.parse("<rss><channel/></rss>".getBytes()));
        assertThrows(Exception.class, () -> RecallService.parse("<!DOCTYPE rss SYSTEM 'file:///secret'><rss/>".getBytes()));
    }
    @Test void cachesAndRetainsLastGoodNoticesOnFailure() {
        var fail = new AtomicBoolean(false);
        var clock = new Clock() {
            Instant now = Instant.parse("2026-09-17T12:00:00Z");
            public ZoneId getZone() { return ZoneOffset.UTC; }
            public Clock withZone(ZoneId zone) { return this; }
            public Instant instant() { return now; }
        };
        var service = new RecallService(() -> { if (fail.get()) throw new Exception(); return xml(LINK); }, clock);
        var good = service.get();
        fail.set(true);
        assertSame(good, service.get());
        clock.now = clock.now.plusSeconds(901);
        var stale = service.get();
        assertTrue(stale.stale());
        assertEquals(good.items(), stale.items());
        assertEquals(good.lastSuccessfulCheck(), stale.lastSuccessfulCheck());
    }
    @Test void initialFailureIsUnknown() {
        var service = new RecallService(() -> { throw new Exception(); }, Clock.systemUTC());
        assertTrue(service.get().stale());
        assertNull(service.get().lastSuccessfulCheck());
    }
}
