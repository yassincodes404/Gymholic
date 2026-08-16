package com.gymholic.cart;

import com.gymholic.cart.dto.AddCartItemRequest;
import com.gymholic.cart.dto.CartDto;
import com.gymholic.cart.dto.CartItemDto;
import com.gymholic.cart.dto.UserCartDto;
import com.gymholic.cart.entity.CartItem;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public CartDto getCart(String email) {
        User user = requireUser(email);
        List<CartItemDto> items = cartRepository.findByUserIdOrderByCreatedAtAsc(user.getId())
            .stream().map(this::toDto).toList();
        return summarize(items);
    }

    /** Adds (or refreshes) an item. Digital products: one of each, no quantity bump. */
    @Transactional
    public CartDto addItem(String email, AddCartItemRequest request) {
        User user = requireUser(email);

        CartItem item = cartRepository.findByUserIdAndProductId(user.getId(), request.getProductId())
            .orElseGet(() -> CartItem.builder().user(user).productId(request.getProductId()).build());

        item.setProductType(request.getProductType() == null ? "BLUEPRINT" : request.getProductType());
        item.setTitle(request.getTitle());
        item.setPrice(request.getPrice());
        item.setCurrency(request.getCurrency() == null ? "USD" : request.getCurrency());
        item.setQuantity(1);

        cartRepository.save(item);
        return getCart(email);
    }

    @Transactional
    public CartDto removeItem(String email, String productId) {
        User user = requireUser(email);
        cartRepository.findByUserIdAndProductId(user.getId(), productId)
            .ifPresent(cartRepository::delete);
        return getCart(email);
    }

    @Transactional
    public void clear(String email) {
        User user = requireUser(email);
        cartRepository.deleteByUserId(user.getId());
    }

    /** Admin view: every user's cart with totals. */
    @Transactional(readOnly = true)
    public List<UserCartDto> getAllCarts() {
        Map<Long, UserCartDto> byUser = new LinkedHashMap<>();
        for (CartItem item : cartRepository.findAllByOrderByUserIdAscCreatedAtAsc()) {
            UserCartDto dto = byUser.computeIfAbsent(item.getUser().getId(), id ->
                UserCartDto.builder()
                    .userId(id)
                    .userEmail(item.getUser().getEmail())
                    .userName(item.getUser().getFirstName() + " " + item.getUser().getLastName())
                    .items(new ArrayList<>())
                    .subtotal(BigDecimal.ZERO)
                    .build());
            dto.getItems().add(toDto(item));
            dto.setSubtotal(dto.getSubtotal().add(item.getPrice()));
        }
        return new ArrayList<>(byUser.values());
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private CartDto summarize(List<CartItemDto> items) {
        BigDecimal subtotal = items.stream()
            .map(CartItemDto::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return CartDto.builder().items(items).subtotal(subtotal).count(items.size()).build();
    }

    private CartItemDto toDto(CartItem item) {
        return CartItemDto.builder()
            .id(item.getId())
            .productId(item.getProductId())
            .productType(item.getProductType())
            .title(item.getTitle())
            .price(item.getPrice())
            .currency(item.getCurrency())
            .quantity(item.getQuantity())
            .build();
    }
}
