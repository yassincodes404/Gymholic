package com.gymholic.order;

import com.gymholic.cart.CartRepository;
import com.gymholic.cart.entity.CartItem;
import com.gymholic.common.enums.Role;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.notification.NotificationService;
import com.gymholic.order.dto.OrderDto;
import com.gymholic.order.dto.OrderItemDto;
import com.gymholic.order.entity.Order;
import com.gymholic.order.entity.OrderItem;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final com.gymholic.whitelist.WhitelistRepository whitelistRepository;
    private final com.gymholic.settings.SettingsService settingsService;

    /**
     * Checks out the user's cart into a paid order. Payments are still in
     * test mode (mock provider), so the order is created and completed in one
     * step; when Paymob goes live this becomes create-PENDING -> webhook-PAID.
     */
    @Transactional
    public OrderDto checkout(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        List<CartItem> cartItems = cartRepository.findByUserIdOrderByCreatedAtAsc(user.getId());
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Your cart is empty.");
        }

        BigDecimal total = cartItems.stream()
            .map(CartItem::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = Order.builder()
            .user(user)
            .status(Order.Status.PAID)
            .total(total)
            .currency(cartItems.get(0).getCurrency())
            .providerName("mock")
            .providerRef("mock-order-" + UUID.randomUUID())
            .build();
        Order saved = orderRepository.save(order);

        List<OrderItem> items = new ArrayList<>();
        for (CartItem cartItem : cartItems) {
            items.add(orderItemRepository.save(OrderItem.builder()
                .order(saved)
                .productId(cartItem.getProductId())
                .productType(cartItem.getProductType())
                .title(cartItem.getTitle())
                .unitPrice(cartItem.getPrice())
                .quantity(1)
                .build()));
        }

        cartRepository.deleteByUserId(user.getId());

        // Pre-purchased Academy membership: the buyer is guaranteed launch
        // access — register them on the Academy whitelist as a pre-purchase.
        boolean academyPrePurchase = items.stream()
            .anyMatch(i -> "ACADEMY".equalsIgnoreCase(i.getProductType()));
        if (academyPrePurchase) {
            addAcademyPrePurchase(user, total);
        }

        notify(user, saved, items);
        return toDto(saved, items);
    }

    private void addAcademyPrePurchase(User user, java.math.BigDecimal total) {
        try {
            String source = "ACADEMY_PREPURCHASE";
            com.gymholic.whitelist.entity.WhitelistEntry entry = whitelistRepository
                .findByEmailAndSourceIgnoreCase(user.getEmail(), source)
                .orElse(com.gymholic.whitelist.entity.WhitelistEntry.builder()
                    .email(user.getEmail())
                    .source(source)
                    .build());
            entry.setName(user.getFirstName() + " " + user.getLastName());
            entry.setUserId(user.getId());
            whitelistRepository.save(entry);
            log.info("Academy membership pre-purchased by {} (${} USD) — added to whitelist",
                user.getEmail(), total);
        } catch (Exception e) {
            log.warn("Could not add Academy pre-purchase to whitelist for {}: {}",
                user.getEmail(), e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<OrderDto> getMyOrders(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
            .map(order -> toDto(order, orderItemRepository.findByOrderId(order.getId())))
            .toList();
    }

    @Transactional(readOnly = true)
    public OrderDto getOrder(Long id, String requesterEmail, boolean isAdmin) {
        Order order = orderRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        if (!isAdmin && !order.getUser().getEmail().equalsIgnoreCase(requesterEmail)) {
            throw new BadRequestException("You can only view your own orders.");
        }
        return toDto(order, orderItemRepository.findByOrderId(order.getId()));
    }

    private void notify(User user, Order order, List<OrderItem> items) {
        try {
            String amount = order.getTotal().toPlainString() + " " + order.getCurrency();
            String itemsList = items.stream()
                .map(i -> "- " + i.getTitle() + " (" + i.getUnitPrice().toPlainString() + " " + order.getCurrency() + ")")
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");
            notificationService.sendOrderConfirmation(
                user.getEmail(), user.getFirstName(),
                amount, itemsList);
            // The admin copy goes to the ADMIN_NOTIFY_EMAIL override when set,
            // otherwise the first ADMIN account.
            String adminEmail = settingsService.getString("ADMIN_NOTIFY_EMAIL", "");
            if (adminEmail.isBlank()) {
                adminEmail = userRepository.findFirstByRoleOrderByCreatedAtAsc(Role.ADMIN)
                    .map(User::getEmail).orElse("");
            }
            if (!adminEmail.isBlank()) {
                notificationService.sendAdminOrderConfirmation(
                    adminEmail,
                    user.getFirstName() + " " + user.getLastName(),
                    user.getEmail(),
                    amount, itemsList);
            }
        } catch (Exception e) {
            log.warn("Order notification failed for order {}: {}", order.getId(), e.getMessage());
        }
    }

    private OrderDto toDto(Order order, List<OrderItem> items) {
        return OrderDto.builder()
            .id(order.getId())
            .status(order.getStatus().name())
            .total(order.getTotal())
            .currency(order.getCurrency())
            .items(items.stream().map(i -> OrderItemDto.builder()
                .id(i.getId())
                .productId(i.getProductId())
                .productType(i.getProductType())
                .title(i.getTitle())
                .unitPrice(i.getUnitPrice())
                .quantity(i.getQuantity())
                .build()).toList())
            .createdAt(order.getCreatedAt())
            .build();
    }
}
