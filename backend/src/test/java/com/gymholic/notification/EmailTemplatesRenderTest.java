package com.gymholic.notification;

import org.junit.jupiter.api.Test;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Every email renders inside the branded Gymholic shell (dark header with
 * the GYMHOLIC wordmark, cream page, orange accents). These tests process a
 * representative template from each family so a broken shell or leftover
 * default styling fails the build instead of reaching a customer's inbox.
 */
@SpringBootTest
@ActiveProfiles("test")
class EmailTemplatesRenderTest {

    @Autowired
    private TemplateEngine templateEngine;

    private Context ctx(Map<String, Object> vars) {
        Context context = new Context();
        vars.forEach(context::setVariable);
        return context;
    }

    private void assertBranded(String template, Map<String, Object> vars) {
        String html = templateEngine.process(template, ctx(vars));
        assertThat(html).contains("GYMHOLIC.AE");
        assertThat(html).contains("background-color: #0a0a0a");
        assertThat(html).contains("background-color: #f4f2ec");
        assertThat(html).doesNotContain("background-color: #f5f5f5");
    }

    @Test
    void bookingConfirmationIsBranded() {
        assertBranded("booking-confirmation", Map.of(
            "clientName", "Yassin",
            "trainerName", "Coach",
            "dateTime", "Sep 11, 2026 at 12:50 PM",
            "duration", "45",
            "meetLink", "https://meet.google.com/abc",
            "meetingLabel", "Google Meet"));
    }

    @Test
    void paymentSuccessfulIsBranded() {
        assertBranded("payment-successful", Map.of(
            "clientName", "Yassin",
            "amount", "125",
            "currency", "USD",
            "orderId", "42"));
    }

    @Test
    void passwordResetIsBranded() {
        assertBranded("password-reset", Map.of(
            "name", "Yassin",
            "resetLink", "https://gymholic.ae/reset-password?token=x"));
    }

    @Test
    void orderConfirmationIsBranded() {
        assertBranded("order-confirmation", Map.of(
            "name", "Yassin",
            "total", "$49.00",
            "itemsList", "Gym Operations Blueprint"));
    }

    @Test
    void verificationCodeIsBranded() {
        assertBranded("email-verification-code", Map.of(
            "name", "Yassin",
            "code", "123456"));
    }

    @Test
    void reminderIsBranded() {
        assertBranded("reminder", Map.of(
            "name", "Yassin",
            "trainerName", "Coach",
            "dateTime", "Sep 11, 2026 at 12:50 PM",
            "meetLink", ""));
    }

    @Test
    void adminPaymentReviewIsBranded() {
        assertBranded("admin-payment-review", Map.of(
            "clientName", "Yassin",
            "clientEmail", "y@g.com",
            "bookingId", "7",
            "bookingStatus", "CANCELLED",
            "amount", "125",
            "currency", "USD",
            "orderId", ""));
    }
}
