package com.cabinate.api.receipt;

import java.io.IOException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.cabinate.api.common.exception.ErrorResponse;
import tools.jackson.databind.json.JsonMapper;

/** Bound Content-Length and streamed/chunked requests before the JSON parser allocates the upload. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ReceiptUploadFilter extends OncePerRequestFilter {
    static final int MAX_REQUEST_BYTES = 5_100_000;
    private final JsonMapper mapper;
    public ReceiptUploadFilter(JsonMapper mapper) { this.mapper = mapper; }

    public static final class LimitExceeded extends IOException {
        LimitExceeded() { super("Receipt request exceeds size limit"); }
    }

    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !"/api/v1/receipts/extract".equals(request.getServletPath());
    }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getContentLengthLong() > MAX_REQUEST_BYTES) {
            response.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
            response.setContentType("application/json");
            response.getWriter().write(mapper.writeValueAsString(ErrorResponse.of(413, "Payload Too Large",
                    "Receipt upload is too large. Resize the photo and try again.", request.getRequestURI())));
            return;
        }
        chain.doFilter(new HttpServletRequestWrapper(request) {
            private ServletInputStream limited;
            @Override public ServletInputStream getInputStream() throws IOException {
                if (limited == null) limited = new LimitedStream(super.getInputStream());
                return limited;
            }
        }, response);
    }

    static final class LimitedStream extends ServletInputStream {
        private final ServletInputStream input;
        private int read;
        LimitedStream(ServletInputStream input) { this.input = input; }
        @Override public int read() throws IOException {
            int value = input.read();
            if (value != -1 && ++read > MAX_REQUEST_BYTES) throw new LimitExceeded();
            return value;
        }
        @Override public int read(byte[] bytes, int offset, int length) throws IOException {
            int count = input.read(bytes, offset, Math.min(length, MAX_REQUEST_BYTES - read + 1));
            if (count > 0 && (read += count) > MAX_REQUEST_BYTES) throw new LimitExceeded();
            return count;
        }
        @Override public void close() throws IOException { input.close(); }
        @Override public boolean isFinished() { return input.isFinished(); }
        @Override public boolean isReady() { return input.isReady(); }
        @Override public void setReadListener(ReadListener listener) { input.setReadListener(listener); }
    }
}
