package com.arthur.timelimiter.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Origins allowed to call this API, bound from {@code demo.cors.*}.
 *
 * @param allowedOrigins an explicit list. Deliberately not a wildcard -- a demo is exactly the
 *                       kind of code that gets copied into something real, and
 *                       {@code allowedOrigins("*")} is the line that gets carried across unnoticed.
 */
@ConfigurationProperties("demo.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
