package com.cabinate.api.receipt;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.HexFormat;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.http.HttpStatus;
import static com.cabinate.api.receipt.ReceiptContracts.*;

final class ReceiptImage {
    static final int MAX_BYTES = 3_750_000;
    private ReceiptImage() {}

    static ReceiptProvider.Input validate(ExtractRequest request) {
        boolean image = request.imageBase64() != null;
        boolean text = request.text() != null;
        if (image == text) throw bad("Send one receipt photo or receipt text.");
        if (text) {
            if (request.text().isBlank() || request.text().length() > 30_000 || request.mediaType() != null)
                throw bad("Receipt text must contain between 1 and 30,000 characters.");
            return new ReceiptProvider.Input(null, null, request.text(), hash("text", request.text().strip().getBytes(StandardCharsets.UTF_8)));
        }
        String format = switch (request.mediaType() == null ? "" : request.mediaType()) {
            case "image/jpeg" -> "jpeg";
            case "image/png" -> "png";
            default -> throw bad("Use a JPEG or PNG receipt photo.");
        };
        if (request.imageBase64().length() > 5_000_000)
            throw new ReceiptException(HttpStatus.PAYLOAD_TOO_LARGE, "Receipt photo must be smaller than 3.75 MB.");
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(request.imageBase64()); }
        catch (IllegalArgumentException ex) { throw bad("Receipt photo is not valid base64."); }
        if (bytes.length == 0) throw bad("Receipt photo is empty.");
        if (bytes.length > MAX_BYTES)
            throw new ReceiptException(HttpStatus.PAYLOAD_TOO_LARGE, "Receipt photo must be smaller than 3.75 MB.");
        boolean signature = format.equals("jpeg")
                ? bytes.length >= 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255
                : bytes.length >= 8 && java.util.Arrays.equals(java.util.Arrays.copyOf(bytes, 8),
                        new byte[]{(byte) 137, 80, 78, 71, 13, 10, 26, 10});
        if (!signature) throw bad("Receipt photo does not match its image type.");
        // Read dimensions without allocating/decompressing a potentially enormous bitmap.
        try (var stream = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw bad("Receipt photo could not be opened.");
            var reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > 8000 || height > 8000)
                    throw bad("Receipt photo dimensions must be at most 8000 pixels per side.");
            } finally { reader.dispose(); }
        } catch (ReceiptException ex) { throw ex; }
        catch (Exception ex) { throw bad("Receipt photo could not be opened."); }
        return new ReceiptProvider.Input(Base64.getEncoder().encodeToString(bytes), format, null, hash("image", bytes));
    }

    private static String hash(String type, byte[] bytes) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update(type.getBytes(StandardCharsets.UTF_8));
            digest.update((byte) 0);
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }

    private static ReceiptException bad(String message) { return new ReceiptException(HttpStatus.BAD_REQUEST, message); }
}
