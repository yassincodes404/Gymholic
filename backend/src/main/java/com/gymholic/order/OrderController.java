package com.gymholic.order;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.order.dto.OrderDto;
import com.gymholic.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** Checks out the signed-in user's cart into a paid order (test payment mode). */
    @PostMapping
    public ResponseEntity<ApiResponse<OrderDto>> checkout() {
        OrderDto order = orderService.checkout(requireEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Order completed", order));
    }

    /** The signed-in user's product purchase history (courses, PDFs, physical goods). */
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderDto>>> myOrders() {
        return ResponseEntity.ok(ApiResponse.success(orderService.getMyOrders(requireEmail())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDto>> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
            orderService.getOrder(id, requireEmail(), SecurityUtils.hasRole("ADMIN"))));
    }

    private String requireEmail() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) throw new IllegalStateException("Not authenticated");
        return email;
    }
}
