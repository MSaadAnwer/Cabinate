package com.cabinate.api.recall;

import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1/recalls")
public class RecallController {
    private final RecallService service;
    public RecallController(RecallService service) { this.service = service; }
    @GetMapping
    public RecallService.Feed get() { return service.get(); }
}
