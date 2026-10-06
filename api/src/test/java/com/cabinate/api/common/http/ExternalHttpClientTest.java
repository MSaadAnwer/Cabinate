package com.cabinate.api.common.http;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.Executors;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ExternalHttpClientTest {
    private HttpServer server;
    private ExternalHttpClient client;
    private java.util.concurrent.ExecutorService executor;

    @BeforeEach void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        executor = Executors.newVirtualThreadPerTaskExecutor();
        server.setExecutor(executor);
        client = new ExternalHttpClient();
        server.start();
    }

    @AfterEach void stop() {
        client.close();
        server.stop(0);
        executor.shutdownNow();
    }

    private HttpRequest request(String path, Duration timeout) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + server.getAddress().getPort() + path))
                .timeout(timeout).GET().build();
    }

    @Test void returnsExactLimitAndReusesClientAfterOversizedChunkedResponse() throws Exception {
        server.createContext("/small", exchange -> {
            try (exchange) {
                exchange.sendResponseHeaders(200, 4);
                exchange.getResponseBody().write("food".getBytes(StandardCharsets.UTF_8));
            }
        });
        server.createContext("/large", exchange -> {
            try (exchange) {
                exchange.sendResponseHeaders(200, 0); // Chunked: no Content-Length to trust.
                exchange.getResponseBody().write(new byte[8192]);
            }
        });
        assertThrows(IOException.class, () -> client.send(request("/large", Duration.ofSeconds(3)), 1024));
        var result = client.send(request("/small", Duration.ofSeconds(3)), 4);
        assertEquals(200, result.statusCode());
        assertEquals("food", new String(result.body(), StandardCharsets.UTF_8));
    }

    @Test void deadlineCoversResponseBodyAfterHeadersArrive() {
        server.createContext("/slow", exchange -> {
            try (exchange) {
                exchange.sendResponseHeaders(200, 0);
                exchange.getResponseBody().write('x');
                exchange.getResponseBody().flush();
                try { Thread.sleep(5000); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            }
        });
        assertThrows(HttpTimeoutException.class,
                () -> client.send(request("/slow", Duration.ofMillis(500)), 1024));
    }

    @Test void doesNotFollowRedirectsToAnotherDestination() throws Exception {
        server.createContext("/redirect", exchange -> {
            try (exchange) {
                exchange.getResponseHeaders().add("Location", "/destination");
                exchange.sendResponseHeaders(302, -1);
            }
        });
        assertEquals(302, client.send(request("/redirect", Duration.ofSeconds(3)), 1024).statusCode());
    }
}
