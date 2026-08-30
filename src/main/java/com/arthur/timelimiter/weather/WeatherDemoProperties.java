package com.arthur.timelimiter.weather;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Demo knobs, bound from the {@code demo.weather.*} block in {@code application.yml}.
 *
 * @param defaultDelay latency the simulated upstream uses when the request omits {@code ?delayMs}
 */
@ConfigurationProperties("demo.weather")
public record WeatherDemoProperties(Duration defaultDelay) {
}
