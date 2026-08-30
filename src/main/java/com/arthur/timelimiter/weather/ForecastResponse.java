package com.arthur.timelimiter.weather;

import java.time.Instant;

/**
 * A weather forecast, tagged with the path that produced it.
 *
 * <p>{@link Source} is the point of the whole demo: it lets a caller see, from the response body
 * alone, whether the upstream answered in time or the TimeLimiter gave up and the fallback ran.
 */
public record ForecastResponse(String forecast, Source source, Instant retrievedAt) {

    public enum Source {
        /** The simulated upstream returned before the configured timeout. */
        UPSTREAM,
        /** The TimeLimiter timed the call out and the fallback method answered instead. */
        FALLBACK
    }

    public static ForecastResponse fromUpstream(String forecast) {
        return new ForecastResponse(forecast, Source.UPSTREAM, Instant.now());
    }

    public static ForecastResponse fromFallback(String forecast) {
        return new ForecastResponse(forecast, Source.FALLBACK, Instant.now());
    }
}
