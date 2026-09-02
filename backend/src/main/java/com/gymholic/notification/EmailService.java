package com.gymholic.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import jakarta.mail.internet.MimeMessage;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Sends transactional email over whichever sender is active:
 * Brevo's HTTPS API when the admin configured it (production), classic
 * SMTP otherwise (MailHog in dev). Rendering is Thymeleaf either way.
 * Attachments (calendar invites) travel as base64 with Brevo and as
 * inline resources over SMTP.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    /** Named binary attachment (calendar invite). Raw bytes for SMTP, base64 for Brevo. */
    public record EmailAttachment(String name, String contentType, byte[] content) {
        String base64() {
            return Base64.getEncoder().encodeToString(content);
        }
    }

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final BrevoConfigService brevoConfigService;

    @Value("${app.mail.from:noreply@gymholic.ae}")
    private String fromAddress;

    @Value("${app.mail.from-name:Gymholic}")
    private String fromName;

    /** Replies land here (a monitored inbox) rather than the send-only from. */
    @Value("${app.mail.reply-to:}")
    private String replyToAddress;

    /** Fire-and-forget send used for notifications — never throws. */
    @Async
    public void sendEmail(String to, String subject, String templateName,
                          Map<String, Object> variables) {
        sendEmail(to, null, subject, templateName, variables, List.of());
    }

    @Async
    public void sendEmail(String to, String subject, String templateName,
                          Map<String, Object> variables, List<EmailAttachment> attachments) {
        sendEmail(to, null, subject, templateName, variables, attachments);
    }

    /**
     * Send with a per-message reply-to (e.g. a support message replies
     * straight to the client who wrote it, not the global reply-to).
     */
    @Async
    public void sendEmail(String to, String replyTo, String subject, String templateName,
                          Map<String, Object> variables) {
        sendEmail(to, replyTo, subject, templateName, variables, List.of());
    }

    @Async
    public void sendEmail(String to, String replyTo, String subject, String templateName,
                          Map<String, Object> variables, List<EmailAttachment> attachments) {
        try {
            sendEmailNow(to, replyTo, subject, templateName, variables, attachments);
            log.info("Email sent to {} with subject: {}", to, subject);
        } catch (Exception e) {
            // Never let email problems roll back booking/payment transactions.
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    /**
     * Synchronous send used when the caller must know the outcome (email
     * verification codes, admin connection tests). Throws on failure.
     */
    public void sendEmailNow(String to, String subject, String templateName,
                             Map<String, Object> variables) throws Exception {
        sendEmailNow(to, subject, templateName, variables, List.of());
    }

    public void sendEmailNow(String to, String subject, String templateName,
                             Map<String, Object> variables,
                             List<EmailAttachment> attachments) throws Exception {
        sendEmailNow(to, null, subject, templateName, variables, attachments);
    }

    public void sendEmailNow(String to, String replyTo, String subject, String templateName,
                             Map<String, Object> variables,
                             List<EmailAttachment> attachments) throws Exception {
        Context context = new Context();
        context.setVariables(variables);
        String htmlContent = templateEngine.process(templateName, context);

        if (brevoConfigService.isBrevoActive()) {
            sendViaBrevo(to, subject, htmlContent, attachments, replyTo);
        } else {
            sendViaSmtp(to, subject, htmlContent, attachments, replyTo);
        }
    }

    private void sendViaBrevo(String to, String subject, String htmlContent,
                              List<EmailAttachment> attachments, String replyTo) {
        BrevoConfigService.BrevoCredentials creds = brevoConfigService.getBrevoCredentials();

        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of(
            "name", creds.senderName() != null ? creds.senderName() : fromName,
            "email", creds.senderEmail()));
        String effectiveReplyTo = replyTo != null && !replyTo.isBlank() ? replyTo : replyToAddress;
        if (effectiveReplyTo != null && !effectiveReplyTo.isBlank()) {
            body.put("replyTo", Map.of(
                "name", creds.senderName() != null ? creds.senderName() : fromName,
                "email", effectiveReplyTo));
        }
        body.put("to", List.of(Map.of("email", to)));
        body.put("subject", subject);
        body.put("htmlContent", htmlContent);
        if (attachments != null && !attachments.isEmpty()) {
            List<Map<String, String>> parts = new ArrayList<>();
            for (EmailAttachment attachment : attachments) {
                // Brevo's attachment shape: {"name": ..., "content": <base64>}
                parts.add(Map.of(
                    "name", attachment.name(),
                    "content", attachment.base64()));
            }
            body.put("attachment", parts);
        }

        RestClient client = RestClient.create();
        try {
            client.post()
                .uri(BREVO_API_URL)
                .header("api-key", creds.apiKey())
                .header("accept", "application/json")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
        } catch (Exception e) {
            throw new IllegalStateException("Brevo rejected the email: " + e.getMessage(), e);
        }
    }

    private void sendViaSmtp(String to, String subject, String htmlContent,
                             List<EmailAttachment> attachments, String replyTo) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromAddress, fromName);
        helper.setTo(to);
        String effectiveReplyTo = replyTo != null && !replyTo.isBlank() ? replyTo : replyToAddress;
        if (effectiveReplyTo != null && !effectiveReplyTo.isBlank()) {
            helper.setReplyTo(effectiveReplyTo);
        }
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        if (attachments != null) {
            for (EmailAttachment attachment : attachments) {
                helper.addAttachment(attachment.name(),
                    new ByteArrayResource(attachment.content()), attachment.contentType());
            }
        }
        mailSender.send(message);
    }
}
