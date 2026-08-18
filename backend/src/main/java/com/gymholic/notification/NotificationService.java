package com.gymholic.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final EmailService emailService;
    private final IcsService icsService;

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
        sendBookingConfirmation(toEmail, clientName, trainerName, dateTime, duration,
            meetLink, "Google Meet", null);
    }

    /**
     * Confirmation with the calendar invite attached and the meeting
     * platform called out (Zoom when configured, Google Meet otherwise).
     */
    public void sendBookingConfirmation(String toEmail, String clientName,
                                         String trainerName, String dateTime, String duration,
                                         String meetLink, String meetingLabel,
                                         com.gymholic.booking.entity.Booking booking) {
        List<EmailService.EmailAttachment> attachments =
            booking != null ? List.of(icsService.bookingInvite(booking)) : List.of();
        emailService.sendEmail(
            toEmail,
            "Booking Confirmed — Gymholic",
            "booking-confirmation",
            Map.of(
                "clientName", clientName,
                "trainerName", trainerName,
                "dateTime", dateTime,
                "duration", duration,
                "meetLink", meetLink != null ? meetLink : "",
                "meetingLabel", meetingLabel != null ? meetingLabel : "Google Meet"
            ),
            attachments);
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

    /** Rescheduled confirmation with a refreshed calendar invite attached. */
    public void sendBookingRescheduledWithInvite(String toEmail, String clientName,
                                                 String trainerName, String oldDateTime, String newDateTime,
                                                 String meetLink,
                                                 com.gymholic.booking.entity.Booking booking) {
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
            ),
            List.of(icsService.bookingInvite(booking)));
    }

    /** Admin rejected the booking (slot unavailable, payment issue, …). */
    public void sendBookingRejected(String toEmail, String clientName,
                                    String dateTime, String reason) {
        emailService.sendEmail(
            toEmail,
            "Booking Could Not Be Confirmed — Gymholic",
            "booking-rejected",
            Map.of(
                "clientName", clientName,
                "dateTime", dateTime,
                "reason", reason != null && !reason.isBlank() ? reason : "The requested slot is no longer available."
            ));
    }

    /** Session delivered and closed — thank-you note to the client. */
    public void sendBookingCompleted(String toEmail, String clientName,
                                     String trainerName, String dateTime) {
        emailService.sendEmail(
            toEmail,
            "Thanks for your session — Gymholic",
            "booking-completed",
            Map.of(
                "clientName", clientName,
                "trainerName", trainerName,
                "dateTime", dateTime
            ));
    }

    /** Post-session follow-up a day later with a rebooking nudge. */
    public void sendFollowUp(String toEmail, String clientName, String bookUrl) {
        emailService.sendEmail(
            toEmail,
            "Quick follow-up on your Gymholic session",
            "booking-follow-up",
            Map.of(
                "clientName", clientName,
                "bookUrl", bookUrl
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

    public void sendPasswordChanged(String toEmail, String name) {
        emailService.sendEmail(
            toEmail,
            "Your Gymholic password was changed",
            "password-changed",
            Map.of("name", name != null ? name : "there"));
    }

    public void sendAccountCreated(String toEmail, String name) {
        emailService.sendEmail(
            toEmail,
            "Your Gymholic account is created",
            "account-created",
            Map.of("name", name != null ? name : "there"));
    }

    public void sendAccountActivated(String toEmail, String name) {
        emailService.sendEmail(
            toEmail,
            "Your Gymholic account is active again",
            "account-activated",
            Map.of("name", name != null ? name : "there"));
    }

    public void sendAccountDeactivated(String toEmail, String name) {
        emailService.sendEmail(
            toEmail,
            "Your Gymholic account has been deactivated",
            "account-deactivated",
            Map.of("name", name != null ? name : "there"));
    }

    public void sendAccountDeleted(String toEmail, String name) {
        emailService.sendEmail(
            toEmail,
            "Your Gymholic account has been deleted",
            "account-deleted",
            Map.of("name", name != null ? name : "there"));
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
