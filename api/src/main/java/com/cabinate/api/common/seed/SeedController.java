package com.cabinate.api.common.seed;

import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1/seed")
@RequiredArgsConstructor
public class SeedController {

    private final DatabaseSeeder databaseSeeder;

    @PostMapping
    public Map<String, Object> triggerSeed(@RequestParam(defaultValue = "false") boolean force) {
        Map<String, Integer> counts = databaseSeeder.seedAll(force);
        return Map.of(
                "message", "Database seeding operation finished successfully",
                "forced", force,
                "summary", counts);
    }
}
