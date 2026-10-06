package com.cabinate.api.common.http;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

/** Shared connection pool; response limits are enforced as bytes arrive, including chunked bodies. */
@Component
public class ExternalHttpClient {
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public HttpResponse<byte[]> send(HttpRequest request, int maxBytes) throws IOException, InterruptedException {
        if (maxBytes <= 0) throw new IllegalArgumentException("Response limit must be positive");
        if (request.timeout().isEmpty()) throw new IllegalArgumentException("Request timeout is required");
        var response = client.sendAsync(request, info -> new LimitedSubscriber(maxBytes));
        try {
            // Bound the complete exchange, including a server that sends headers then stalls.
            return response.get(request.timeout().orElseThrow().toNanos(), TimeUnit.NANOSECONDS);
        } catch (TimeoutException ex) {
            response.cancel(true);
            throw new HttpTimeoutException("Upstream request timed out");
        } catch (InterruptedException ex) {
            response.cancel(true);
            throw ex;
        } catch (ExecutionException ex) {
            if (ex.getCause() instanceof IOException io) throw io;
            throw new IOException("Upstream request failed", ex.getCause());
        }
    }

    @PreDestroy
    public void close() {
        client.shutdownNow();
    }

    private static final class LimitedSubscriber implements HttpResponse.BodySubscriber<byte[]> {
        private final HttpResponse.BodySubscriber<byte[]> delegate = HttpResponse.BodySubscribers.ofByteArray();
        private final int limit;
        private Flow.Subscription subscription;
        private long received;
        private boolean done;

        LimitedSubscriber(int limit) { this.limit = limit; }

        @Override public CompletionStage<byte[]> getBody() { return delegate.getBody(); }
        @Override public void onSubscribe(Flow.Subscription value) {
            subscription = value;
            delegate.onSubscribe(value);
        }
        @Override public void onNext(List<ByteBuffer> buffers) {
            if (done) return;
            for (var buffer : buffers) received += buffer.remaining();
            if (received > limit) {
                done = true;
                subscription.cancel();
                delegate.onError(new IOException("Upstream response exceeds the configured size limit"));
            } else {
                delegate.onNext(buffers);
            }
        }
        @Override public void onError(Throwable failure) {
            if (!done) {
                done = true;
                delegate.onError(failure);
            }
        }
        @Override public void onComplete() {
            if (!done) {
                done = true;
                delegate.onComplete();
            }
        }
    }
}
