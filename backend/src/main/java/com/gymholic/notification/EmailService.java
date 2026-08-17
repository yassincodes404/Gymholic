package com.gymholic.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import jakarta.mail.internet.MimeMessage;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Sends transactional email over whichever sender is active:
 * Brevo's HTTPS API when the admin configured it (production), classic
 * SMTP otherwise (MailHog in dev). Rendering is Thymeleaf either way.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final BrevoConfigService brevoConfigService;

    @Value("${app.mail.from:noreply@gymholic.com}")
    private String fromAddress;

    @Value("${app.mail.from-name:Gymholic}")
    private String fromName;

    /** Fire-and-forget send used for notifications — never throws. */
    @Async
    public void sendEmail(String to, String subject, String templateName,
                          Map<String, Object> variables) {
        try {
            sendEmailNow(to, subject, templateName, variables);
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
        Context context = new Context();
        context.setVariables(variables);
        String htmlContent = templateEngine.process(templateName, context);

        if (brevoConfigService.isBrevoActive()) {
            sendViaBrevo(to, subject, htmlContent);
        } else {
            sendViaSmtp(to, subject, htmlContent);
        }
    }

    private void sendViaBrevo(String to, String subject, String htmlContent) {
        BrevoConfigService.BrevoCredentials creds = brevoConfigService.getBrevoCredentials();
        Map<String, Object> body = Map.of(
            "sender", Map.of(
                "name", creds.senderName() != null ? creds.senderName() : fromName,
                "email", creds.senderEmail()),
            "to", List.of(Map.of("email", to)),
            "subject", subject,
            "htmlContent", htmlContent);

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

    private void sendViaSmtp(String to, String subject, String htmlContent) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        mailSender.send(message);
    }
}
