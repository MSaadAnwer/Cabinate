package com.cabinate.api.common.seed;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SeedConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(DatabaseSeeder.class, () -> mock(DatabaseSeeder.class))
            .withUserConfiguration(SeedController.class);

    @Test void resetEndpointIsAbsentUnlessExplicitlyEnabled() {
        runner.run(context -> assertThat(context).doesNotHaveBean(SeedController.class));
        runner.withPropertyValues("cabinate.seed.api-enabled=false")
                .run(context -> assertThat(context).doesNotHaveBean(SeedController.class));
        runner.withPropertyValues("cabinate.seed.api-enabled=true")
                .run(context -> assertThat(context).doesNotHaveBean(SeedController.class));
        runner.withPropertyValues("spring.profiles.active=dev", "cabinate.seed.api-enabled=true")
                .run(context -> assertThat(context).hasSingleBean(SeedController.class));
    }
}
