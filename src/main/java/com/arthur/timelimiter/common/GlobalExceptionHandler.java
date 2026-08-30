package com.arthur.timelimiter.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeoutException;

/**
 * Renders failures as RFC 9457 problem details instead of Spring's default error body.
 *
 * <p>Extending {@link ResponseEntityExceptionHandler} matters: {@code @ControllerAdvice} is
 * consulted <em>before</em> Spring's default resolver, so a bare {@code @ExceptionHandler(Exception.class)}
 * in a standalone advice would intercept bean-validation and routing failures too and report them
 * all as 500s. The inherited handlers keep those mapped to their proper statuses, and the catch-all
 * below only sees what is genuinely unexpected.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Reached only when a {@code @TimeLimiter} times out with no matching fallback — which is
     * exactly the failure this project originally shipped with. A gateway timeout is the honest
     * status: the request was fine, the dependency was too slow.
     */
    @ExceptionHandler({TimeoutException.class, CompletionException.class})
    public ProblemDetail handleTimeout(Exception e) {
        Throwable cause = (e instanceof CompletionException && e.getCause() != null) ? e.getCause() : e;
        if (!(cause instanceof TimeoutException)) {
            return handleUnexpected(cause);
        }
        log.warn("Call exceeded its time limit with no fallback available", cause);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.GATEWAY_TIMEOUT, "The upstream weather service did not respond in time.");
        problem.setTitle("Upstream timeout");
        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Throwable e) {
        log.error("Unhandled exception", e);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error.");
        problem.setTitle("Internal error");
        return problem;
    }
}
