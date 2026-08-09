package com.gymholic.payment.webhook;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/payments/webhook")
@RequiredArgsConstructor
public class PaymentWebhookController {

    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        log.info("Received Stripe webhook");
        // TODO: Verify signature and process payment event
        return ResponseEntity.ok("OK");
    }

    @PostMapping("/paymob")
    public ResponseEntity<String> handlePaymobWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Paymob-Signature", required = false) String signature) {
        log.info("Received Paymob webhook");
        // TODO: Verify HMAC and process payment event
        return ResponseEntity.ok("OK");
    }
}
