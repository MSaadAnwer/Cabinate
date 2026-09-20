package com.cabinate.api.recall;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Element;
import org.springframework.stereotype.Service;

/** Public notices, not enforcement data or a determination that a pantry item is affected. */
@Service
public class RecallService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RecallService.class);
    static final URI FEED = URI.create("https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-safety-recalls/rss.xml");
    public record Notice(String id, String title, String description, String url, Instant publishedAt) {}
    public record Feed(List<Notice> items, Instant lastSuccessfulCheck, Instant lastAttempt, boolean stale) {}
    interface Fetcher { byte[] fetch() throws Exception; }
    private final Fetcher fetcher;
    private final Clock clock;
    private Feed cached = new Feed(List.of(), null, null, true);

    public RecallService() { this(RecallService::download, Clock.systemUTC()); }
    RecallService(Fetcher fetcher, Clock clock) { this.fetcher = fetcher; this.clock = clock; }

    // Demand-driven cache: at most one upstream request per 15 minutes across clients.
    public synchronized Feed get() {
        Instant now = clock.instant();
        if (cached.lastAttempt() != null && now.isBefore(cached.lastAttempt().plusSeconds(900))) return cached;
        try {
            cached = new Feed(parse(fetcher.fetch()), now, now, false);
        } catch (Exception e) {
            log.warn("Could not refresh FDA recall notices: {}", e.toString());
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            cached = new Feed(cached.items(), cached.lastSuccessfulCheck(), now, true);
        }
        return cached;
    }

    private static byte[] download() throws Exception {
        try (var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
            var request = HttpRequest.newBuilder(FEED).timeout(Duration.ofSeconds(12))
                .header("Accept", "application/rss+xml, application/xml").GET().build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() != 200) throw new IllegalStateException("Recall source HTTP " + response.statusCode());
                byte[] bytes = response.body();
                if (bytes.length > 2_000_000) throw new IllegalStateException("Recall feed too large");
                return bytes;
        }
    }

    static List<Notice> parse(byte[] xml) throws Exception {
        var factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        var doc = factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
        if (!"rss".equals(doc.getDocumentElement().getTagName()) || doc.getElementsByTagName("channel").getLength() != 1)
            throw new IllegalArgumentException("Unexpected recall format");
        var nodes = doc.getElementsByTagName("item");
        Map<String, Notice> notices = new LinkedHashMap<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            var item = (Element) nodes.item(i);
            URI link = URI.create(field(item, "link"));
            if (!Set.of("http", "https").contains(link.getScheme()) || !"www.fda.gov".equalsIgnoreCase(link.getHost())
                || !link.getPath().startsWith("/safety/recalls-market-withdrawals-safety-alerts/")
                || link.getUserInfo() != null || link.getPort() != -1) throw new IllegalArgumentException("Invalid source link");
            String url = "https://www.fda.gov" + link.getRawPath();
            String title = field(item, "title");
            if (title.isBlank()) throw new IllegalArgumentException("Missing recall title");
            // FDA emits US timezone abbreviations, which RFC_1123 does not accept.
            String date = field(item, "pubDate").replace(" EDT", " -0400").replace(" EST", " -0500");
            Instant published = ZonedDateTime.parse(date, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
            notices.put(url, new Notice(url, title, field(item, "description"), url, published));
        }
        // An unexpectedly empty feed must not erase the last good notices.
        if (notices.isEmpty()) throw new IllegalArgumentException("Empty recall feed");
        return notices.values().stream().sorted(Comparator.comparing(Notice::publishedAt).reversed()).limit(100).toList();
    }

    private static String field(Element item, String name) {
        var nodes = item.getElementsByTagName(name);
        return nodes.getLength() == 0 ? "" : nodes.item(0).getTextContent().replaceAll("<[^>]*>", "").strip();
    }
}
