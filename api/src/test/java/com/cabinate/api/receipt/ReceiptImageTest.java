package com.cabinate.api.receipt;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import static com.cabinate.api.receipt.ReceiptContracts.*;
import static org.junit.jupiter.api.Assertions.*;

class ReceiptImageTest {
    static String png(int width, int height) throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "png", bytes);
        return Base64.getEncoder().encodeToString(bytes.toByteArray());
    }

    @Test void acceptsRealImageAndFingerprintsDecodedBytes() throws Exception {
        String base64 = png(2, 2);
        var input = ReceiptImage.validate(new ExtractRequest(base64, "image/png", null));
        assertEquals("png", input.imageFormat());
        assertEquals(base64, input.imageBase64());
        assertEquals(input.sourceHash(), ReceiptImage.validate(new ExtractRequest(base64, "image/png", null)).sourceHash());
        assertEquals(64, input.sourceHash().length());
        assertNull(input.text());
    }

    @Test void acceptsRealJpeg() throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "jpeg", bytes);
        var input = ReceiptImage.validate(new ExtractRequest(Base64.getEncoder().encodeToString(bytes.toByteArray()), "image/jpeg", null));
        assertEquals("jpeg", input.imageFormat());
    }

    @Test void rejectsMissingAmbiguousMalformedAndWrongImageTypes() throws Exception {
        for (var request : java.util.List.of(new ExtractRequest(null, null, null),
                new ExtractRequest(png(1, 1), "image/png", "receipt"),
                new ExtractRequest("not base64", "image/jpeg", null),
                new ExtractRequest("", "image/png", null),
                new ExtractRequest(png(1, 1), "image/jpeg", null),
                new ExtractRequest(png(1, 1), "image/heic", null),
                new ExtractRequest("AQID", "image/png", null))) {
            assertEquals(400, assertThrows(ReceiptException.class, () -> ReceiptImage.validate(request)).status().value());
        }
    }

    @Test void rejectsLargeEncodedUploadsAndDimensionsBeforeProviderUse() throws Exception {
        var oversized = new ExtractRequest("A".repeat(5_000_004), "image/jpeg", null);
        assertEquals(413, assertThrows(ReceiptException.class, () -> ReceiptImage.validate(oversized)).status().value());
        var wide = new ExtractRequest(png(8001, 1), "image/png", null);
        assertEquals(400, assertThrows(ReceiptException.class, () -> ReceiptImage.validate(wide)).status().value());
    }

    @Test void acceptsBoundedTextFallbackAndUsesDifferentSourceDomain() {
        var request = new ExtractRequest(null, null, "Rice 1 pack");
        var input = ReceiptImage.validate(request);
        assertNull(input.imageBase64());
        assertEquals("Rice 1 pack", input.text());
        assertEquals(input.sourceHash(), ReceiptImage.validate(new ExtractRequest(null, null, " Rice 1 pack ")).sourceHash());
        assertThrows(ReceiptException.class, () -> ReceiptImage.validate(new ExtractRequest(null, null, " ")));
        assertThrows(ReceiptException.class, () -> ReceiptImage.validate(new ExtractRequest(null, null, "a".repeat(30_001))));
    }
}
