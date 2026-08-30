package com.arthur.timelimiter.weather;

import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeoutException;

/**
 * Stands in for a slow upstream weather API.
 *
 * <p>There is no real HTTP call here — the latency is simulated so the timeout is reproducible.
 * The delay is a parameter rather than a constant so both outcomes are reachable at runtime:
 * a delay under the configured {@code timeout-duration} returns normally, anything over it trips
 * the TimeLimiter.
 *
 * <p>This is a separate bean from {@link WeatherService} on purpose. {@code @TimeLimiter} is
 * applied by a Spring AOP proxy, and a proxy is only consulted on calls that arrive from outside
 * the bean — a self-invocation would bypass it entirely.
 */
@Component
public class SlowWeatherApiClient {

    private static final Logger log = LoggerFactory.getLogger(SlowWeatherApiClient.class);

    /**
     * The return type must be a {@link java.util.concurrent.CompletionStage}; {@code TimeLimiterAspect}
     * rejects anything else, because a timeout is only enforceable against a value that is still pending.
     */
    @TimeLimiter(name = "weatherForecast", fallbackMethod = "forecastFallback")
    public CompletableFuture<ForecastResponse> fetchForecast(Duration upstreamDelay) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(upstreamDelay);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Simulated upstream call was interrupted", e);
            }
            return ForecastResponse.fromUpstream("Sunny, 24 °C");
        });
    }

    /**
     * A fallback is only resolved if its signature is <em>the guarded method's parameters plus a
     * trailing exception</em>. Drop the {@code TimeoutException} here and Resilience4j logs
     * "No fallback method match found" and rethrows — the timeout surfaces as an HTTP 500 instead.
     */
    @SuppressWarnings("unused") // resolved reflectively by Resilience4j
    private CompletableFuture<ForecastResponse> forecastFallback(Duration upstreamDelay,
                                                                 TimeoutException e) {
        log.warn("Upstream exceeded the time limit after {} — serving fallback", upstreamDelay);
        return CompletableFuture.completedFuture(
                ForecastResponse.fromFallback("Forecast unavailable — please retry shortly"));
    }
}
