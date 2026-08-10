package com.gymholic.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final EmailService emailService;

    public void sendBookingCreated(String toEmail, String clientName,
                                   String trainerName, String dateTime, String paymentUrl) {
        emailService.sendEmail(
            toEmail,
            "Action Required: Complete Your Booking Payment — Gymholic",
            "booking-created",
            Map.of(
                "clientName", clientName,
                "trainerName", trainerName,
                "dateTime", dateTime,
                "paymentUrl", paymentUrl != null ? paymentUrl : ""
            ));
    }

    public void sendPaymentSuccessful(String toEmail, String clientName,
                                      String amount, String currency, String orderId) {
        emailService.sendEmail(
            toEmail,
            "Payment Successful — Gymholic",
            "payment-successful",
            Map.of(
                "clientName", clientName,
                "amount", amount,
                "currency", currency,
                "orderId", orderId
            ));
    }

    public void sendBookingConfirmation(String toEmail, String clientName,
                                         String trainerName, String dateTime, String duration, String meetLink) {
        emailService.sendEmail(
            toEmail,
            "Booking Confirmed — Gymholic",
            "booking-confirmation",
            Map.of(
                "clientName", clientName,
                "trainerName", trainerName,
                "dateTime", dateTime,
                "duration", duration,
                "meetLink", meetLink != null ? meetLink : ""
            ));
    }

    public void sendBookingRescheduled(String toEmail, String clientName,
                                       String trainerName, String oldDateTime, String newDateTime, String meetLink) {
        emailService.sendEmail(
            toEmail,
            "Booking Rescheduled — Gymholic",
            "booking-rescheduled",
            Map.of(
                "clientName", clientName,
                "trainerName", trainerName,
                "oldDateTime", oldDateTime,
                "newDateTime", newDateTime,
                "meetLink", meetLink != null ? meetLink : ""
            ));
    }

    public void sendBookingReminder(String toEmail, String name,
                                     String trainerName, String dateTime,
                                     String meetLink) {
        emailService.sendEmail(
            toEmail,
            "Upcoming Session Reminder — Gymholic",
            "reminder",
            Map.of(
                "name", name,
                "trainerName", trainerName,
                "dateTime", dateTime,
                "meetLink", meetLink != null ? meetLink : ""
            ));
    }

    public void sendBookingCancellation(String toEmail, String name,
                                         String dateTime, String reason) {
        emailService.sendEmail(
            toEmail,
            "Booking Cancelled — Gymholic",
            "cancellation",
            Map.of(
                "name", name,
                "dateTime", dateTime,
                "reason", reason != null ? reason : "No reason provided"
            ));
    }

    public void sendPasswordReset(String toEmail, String name, String resetLink) {
        emailService.sendEmail(
            toEmail,
            "Reset Your Password — Gymholic",
            "password-reset",
            Map.of(
                "name", name,
                "resetLink", resetLink
            ));
    }
}
