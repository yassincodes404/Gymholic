package com.gymholic.payment.webhook;

import com.gymholic.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/payments/webhook")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentService paymentService;

    @PostMapping("/paymob")
    public ResponseEntity<String> handlePaymobWebhook(
            @RequestParam(required = false) String hmac,
            @RequestBody String payload) {
        log.info("Received Paymob webhook");

        try {
            paymentService.handlePaymobWebhook(payload, hmac);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("Failed to process Paymob webhook", e);
            return ResponseEntity.badRequest().body("Webhook processing failed");
        }
    }
}
