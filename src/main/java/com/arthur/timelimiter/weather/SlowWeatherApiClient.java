package com.arthur.timelimiter.weather;

import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

@Service
public class SlowWeatherApiClient {

    @TimeLimiter(name = "weatherForecastLimiter" , fallbackMethod = "fallback")
    public CompletableFuture<String> getWeatherForecast() {
        return CompletableFuture.supplyAsync(() -> {
            try{
                Thread.sleep(5000);
            }catch (InterruptedException e){
                Thread.currentThread().interrupt();
            }
            return "Success after delay";
        });
    }

    public CompletableFuture<String> fallback() {
        return CompletableFuture.completedFuture("Fallback Response - " +
                "Weather Forecast not available at the moment " +
                LocalDateTime.now().toString());
    }
}
