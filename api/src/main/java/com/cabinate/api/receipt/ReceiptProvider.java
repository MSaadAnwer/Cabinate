package com.cabinate.api.receipt;

import java.util.List;
import static com.cabinate.api.receipt.ReceiptContracts.*;

public interface ReceiptProvider {
    record Input(String imageBase64, String imageFormat, String text, String sourceHash) {}
    record Line(String sourceText, String name, Double quantity, String unit, String category,
            String location, Kind kind, Confidence confidence) {}
    record Extraction(String store, String purchaseDate, List<Line> items) {}
    Extraction extract(Input input);
}
