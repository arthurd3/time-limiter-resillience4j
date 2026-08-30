package com.arthur.timelimiter.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Lets the teaching page call this API from its own origin.
 *
 * <p>Running the page with {@code npm run dev} needs none of this: the Vite dev server proxies
 * {@code /api} and {@code /actuator}, which makes those calls same-origin. This covers the case
 * where a built page is served from somewhere else.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final List<String> allowedOrigins;

    CorsConfig(CorsProperties properties) {
        this.allowedOrigins = properties.allowedOrigins();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (allowedOrigins == null || allowedOrigins.isEmpty()) {
            return;
        }
        String[] origins = allowedOrigins.toArray(String[]::new);
        registry.addMapping("/api/**").allowedOrigins(origins).allowedMethods("GET");
        registry.addMapping("/actuator/**").allowedOrigins(origins).allowedMethods("GET");
    }
}
