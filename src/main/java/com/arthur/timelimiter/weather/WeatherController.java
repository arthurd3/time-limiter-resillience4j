package com.arthur.timelimiter.weather;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/v1/weather")
public class WeatherController {

    private final WeatherService weatherService;

    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    /**
     * Returns a forecast, taking {@code delayMs} as the latency the simulated upstream should
     * exhibit. Anything above the configured {@code timeout-duration} trips the TimeLimiter and
     * comes back tagged {@code FALLBACK}; anything below returns tagged {@code UPSTREAM}.
     *
     * <p>Returning a {@code CompletableFuture} hands the request to a servlet async dispatch, so
     * the container thread is not held for the duration of the call.
     */
    @GetMapping("/forecast")
    public CompletableFuture<ForecastResponse> getForecast(
            @RequestParam(required = false) @Min(0) @Max(30_000) Long delayMs) {
        return weatherService.getForecast(delayMs);
    }
}
