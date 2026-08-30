package com.arthur.timelimiter.weather;

import com.arthur.timelimiter.weather.ForecastResponse.Source;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.client.RestTestClient;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Behavioural tests for the TimeLimiter.
 *
 * <p>The timeout is shortened to 500ms here so the suite stays quick while keeping a wide margin
 * either side: the "fast" case answers in 20ms, the "slow" case in 1500ms.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties =
        "resilience4j.timelimiter.instances.weatherForecast.timeout-duration=500ms")
class WeatherTimeLimiterTest {

    private static final String FORECAST = "/api/v1/weather/forecast";

    @LocalServerPort
    private int port;

    @Autowired
    private MeterRegistry meterRegistry;

    private RestTestClient client() {
        return RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    /**
     * The regression test for the bug this project shipped with: a fallback whose signature does not
     * end in a {@code Throwable} is never resolved, and the timeout escapes as an HTTP 500.
     */
    @Test
    void slowUpstreamIsTimedOutAndAnsweredByTheFallback() {
        ForecastResponse body = client().get().uri(FORECAST + "?delayMs=1500")
                .exchange()
                .expectStatus().isOk()
                .returnResult(ForecastResponse.class)
                .getResponseBody();

        assertThat(body).isNotNull();
        assertThat(body.source()).isEqualTo(Source.FALLBACK);
        assertThat(body.forecast()).contains("unavailable");
    }

    @Test
    void fastUpstreamAnswersBeforeTheTimeLimit() {
        ForecastResponse body = client().get().uri(FORECAST + "?delayMs=20")
                .exchange()
                .expectStatus().isOk()
                .returnResult(ForecastResponse.class)
                .getResponseBody();

        assertThat(body).isNotNull();
        assertThat(body.source()).isEqualTo(Source.UPSTREAM);
        assertThat(body.forecast()).isEqualTo("Sunny, 24 °C");
    }

    @Test
    void outOfRangeDelayIsRejectedAsAProblemDetail() {
        client().get().uri(FORECAST + "?delayMs=-1")
                .exchange()
                .expectStatus().isBadRequest()
                .expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void timeoutsAreRecordedOnTheTimeLimiterMeter() {
        client().get().uri(FORECAST + "?delayMs=1500").exchange().expectStatus().isOk();

        double timeouts = meterRegistry.get("resilience4j.timelimiter.calls")
                .tag("name", "weatherForecast")
                .tag("kind", "timeout")
                .counter()
                .count();

        assertThat(timeouts).isGreaterThanOrEqualTo(1.0);
    }
}
