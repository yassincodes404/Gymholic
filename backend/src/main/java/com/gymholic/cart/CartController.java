package com.gymholic.cart;

import com.gymholic.cart.dto.AddCartItemRequest;
import com.gymholic.cart.dto.CartDto;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<ApiResponse<CartDto>> getCart() {
        return ResponseEntity.ok(ApiResponse.success(cartService.getCart(currentUser())));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartDto>> addItem(@Valid @RequestBody AddCartItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Added to cart", cartService.addItem(currentUser(), request)));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<CartDto>> removeItem(@PathVariable String productId) {
        return ResponseEntity.ok(ApiResponse.success("Removed", cartService.removeItem(currentUser(), productId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clear() {
        cartService.clear(currentUser());
        return ResponseEntity.ok(ApiResponse.success("Cart cleared", null));
    }

    @GetMapping("/admin")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<com.gymholic.cart.dto.UserCartDto>>> getAllCarts() {
        return ResponseEntity.ok(ApiResponse.success(cartService.getAllCarts()));
    }

    private String currentUser() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) throw new IllegalStateException("Not authenticated");
        return email;
    }
}
