package com.arthur.timelimiter.weather;

import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class WeatherService {

    private final SlowWeatherApiClient weatherApiClient;

    public WeatherService(SlowWeatherApiClient weatherApiClient) {
        this.weatherApiClient = weatherApiClient;
    }

    public CompletableFuture<String> getWeatherForecast() {
        return weatherApiClient.getWeatherForecast();
    }
}
