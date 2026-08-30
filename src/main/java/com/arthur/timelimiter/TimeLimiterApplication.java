package com.arthur.timelimiter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TimeLimiterApplication {

    public static void main(String[] args) {
        SpringApplication.run(TimeLimiterApplication.class, args);
    }

}
