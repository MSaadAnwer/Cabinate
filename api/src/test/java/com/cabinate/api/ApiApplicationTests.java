package com.cabinate.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "cabinate.seed.enabled=false")
class ApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
