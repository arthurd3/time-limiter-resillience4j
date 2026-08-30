package com.arthur.timelimiter.weather;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/**
 * Resolves how slow the simulated upstream should be for this request, then delegates to the
 * time-limited client.
 */
@Service
public class WeatherService {

    private final SlowWeatherApiClient weatherApiClient;
    private final Duration defaultDelay;

    public WeatherService(SlowWeatherApiClient weatherApiClient, WeatherDemoProperties properties) {
        this.weatherApiClient = weatherApiClient;
        this.defaultDelay = properties.defaultDelay();
    }

    public CompletableFuture<ForecastResponse> getForecast(Long delayMs) {
        Duration upstreamDelay = (delayMs == null) ? defaultDelay : Duration.ofMillis(delayMs);
        return weatherApiClient.fetchForecast(upstreamDelay);
    }
}
