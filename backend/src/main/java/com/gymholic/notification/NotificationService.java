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

    public void sendAdminNewBooking(String adminEmail, String clientName, String clientEmail,
                                     String dateTime, String amount, String currency) {
        emailService.sendEmail(
            adminEmail,
            "New Booking Awaiting Payment — Gymholic",
            "admin-new-booking",
            Map.of(
                "clientName", clientName,
                "clientEmail", clientEmail,
                "dateTime", dateTime,
                "amount", amount,
                "currency", currency
            ));
    }

    public void sendAdminBookingConfirmed(String adminEmail, String clientName, String clientEmail,
                                           String dateTime, String amount, String currency, String meetLink) {
        emailService.sendEmail(
            adminEmail,
            "Consultation Confirmed & Paid — Gymholic",
            "admin-booking-confirmed",
            Map.of(
                "clientName", clientName,
                "clientEmail", clientEmail,
                "dateTime", dateTime,
                "amount", amount,
                "currency", currency,
                "meetLink", meetLink != null ? meetLink : ""
            ));
    }

    public void sendOrderConfirmation(String toEmail, String name, String total, String itemsList) {
        emailService.sendEmail(
            toEmail,
            "Order Confirmed — Gymholic",
            "order-confirmation",
            Map.of("name", name, "total", total, "itemsList", itemsList));
    }

    /** No-show email to the client — template depends on whether the expert attended. */
    public void sendClientNoShow(String toEmail, String clientName, String dateTime,
                                 String rescheduleUrl, String expiresOn, boolean expertAttended) {
        emailService.sendEmail(
            toEmail,
            expertAttended
                ? "We missed you at your session — pick a new time — Gymholic"
                : "Your session was missed — full refund or free rebooking — Gymholic",
            expertAttended ? "no-show-expert-attended" : "no-show-expert-missed",
            Map.of(
                "clientName", clientName,
                "dateTime", dateTime,
                "rescheduleUrl", rescheduleUrl,
                "expiresOn", expiresOn
            ));
    }

    /** No-show record for the admin/expert inbox; flags when a refund is due. */
    public void sendAdminNoShow(String adminEmail, String clientName, String clientEmail,
                                String dateTime, boolean expertAttended, String note, boolean refundDue) {
        emailService.sendEmail(
            adminEmail,
            refundDue
                ? "Action needed: refund due for missed session — Gymholic"
                : "Session marked as no-show — Gymholic",
            "admin-no-show",
            Map.of(
                "clientName", clientName,
                "clientEmail", clientEmail,
                "dateTime", dateTime,
                "expertAttended", String.valueOf(expertAttended),
                "note", note != null ? note : "",
                "refundDue", String.valueOf(refundDue)
            ));
    }

    public void sendAdminOrderConfirmation(String adminEmail, String customerName, String customerEmail,
                                            String total, String itemsList) {
        emailService.sendEmail(
            adminEmail,
            "New Product Order — Gymholic",
            "admin-order-confirmation",
            Map.of(
                "customerName", customerName,
                "customerEmail", customerEmail,
                "total", total,
                "itemsList", itemsList
            ));
    }
}
