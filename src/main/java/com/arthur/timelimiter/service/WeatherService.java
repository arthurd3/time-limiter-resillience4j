package com.arthur.timelimiter.service;

import com.arthur.timelimiter.client.WeatherClient;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class WeatherService {

    private final WeatherClient weatherClient;

    public WeatherService(WeatherClient weatherClient) {
        this.weatherClient = weatherClient;
    }

    public CompletableFuture<String> getWeatherForecast() {
        return weatherClient.getWeatherForecast();
    }
}
