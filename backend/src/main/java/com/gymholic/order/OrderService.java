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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
    private final com.gymholic.auth.PhoneVerificationService phoneVerificationService;
    private final com.gymholic.whitelist.WhitelistRepository whitelistRepository;
    private final com.gymholic.settings.SettingsService settingsService;
    private final com.gymholic.store.repository.ProductRepository productRepository;

    /**
     * Checks out the user's cart into a paid order. Mock/test mode: the
     * order is created and completed in one step; the real Paymob path goes
     * through {@link #createPendingOrder} + the payment webhook instead.
     */
    @Transactional
    public OrderDto checkout(String email) {
        User user = requireUser(email);
        // Mandatory phone verification: no verified number, no purchase.
        phoneVerificationService.requireVerifiedPhone(user);
        // PENDING → markOrderPaid runs the full fulfilment chain (cart clear,
        // Academy whitelist, receipts) exactly like a real webhook would.
        Order saved = buildOrderFromCart(user, Order.Status.PENDING, "mock",
            "mock-order-" + UUID.randomUUID());
        markOrderPaid(saved.getId());
        return toDto(saved, orderItemRepository.findByOrderId(saved.getId()));
    }

    /**
     * Real-gateway path step 1: a PENDING order with server-side pricing.
     * The cart is NOT cleared yet — that happens when the payment webhook
     * flips the order to PAID, so a failed card leaves the cart intact.
     */
    @Transactional
    public OrderDto createPendingOrder(String email, String provider) {
        User user = requireUser(email);
        // Mandatory phone verification: no verified number, no purchase.
        phoneVerificationService.requireVerifiedPhone(user);
        Order saved = buildOrderFromCart(user, Order.Status.PENDING, provider, null);
        return toDto(saved, orderItemRepository.findByOrderId(saved.getId()));
    }

    /**
     * Real-gateway step 2 (webhook / mock completion): flip a PENDING order
     * to PAID and run the fulfilment chain — clear the cart, whitelist the
     * Academy pre-purchase, send the receipts. Idempotent: an order already
     * PAID is returned as-is (webhook retries can land twice).
     */
    @Transactional
    public Order markOrderPaid(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        if (order.getStatus() == Order.Status.PAID) {
            return order;
        }
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        order.setStatus(Order.Status.PAID);
        orderRepository.save(order);
        cartRepository.deleteByUserId(order.getUser().getId());
        if (items.stream().anyMatch(i -> "ACADEMY".equalsIgnoreCase(i.getProductType()))) {
            addAcademyPrePurchase(order.getUser(), order.getTotal());
        }
        notify(order.getUser(), order, items);
        return order;
    }

    /** Payment-side accessor: the entity behind a payment's order id. */
    @Transactional(readOnly = true)
    public Order getOrderForPayment(Long orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    /**
     * Shared cart → order assembly: duplicate-payment guards and
     * server-side pricing (the store's canonical title/price always win —
     * a tampered client-sent price can never override them, mirroring the
     * booking price philosophy in BookingService).
     */
    private Order buildOrderFromCart(User user, Order.Status status, String provider, String providerRef) {
        List<CartItem> cartItems = cartRepository.findByUserIdOrderByCreatedAtAsc(user.getId());
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Your cart is empty.");
        }

        // Duplicate-payment guard: anything the user already paid for (an
        // owned Blueprint, an active Academy membership) is rejected here —
        // a stale cart can never charge the same product twice.
        Set<String> ownedProductIds = new HashSet<>(
            orderItemRepository.findPurchasedProductIds(user.getId(), Order.Status.PAID));
        for (CartItem cartItem : cartItems) {
            if (ownedProductIds.contains(cartItem.getProductId())) {
                throw new BadRequestException(
                    "'" + cartItem.getTitle() + "' is already in your account — remove it from your cart to continue.");
            }
        }

        Order order = Order.builder()
            .user(user)
            .status(status)
            .total(BigDecimal.ZERO)
            .currency(cartItems.get(0).getCurrency())
            .providerName(provider)
            .providerRef(providerRef)
            .build();
        Order saved = orderRepository.save(order);

        List<OrderItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        String currency = cartItems.get(0).getCurrency();
        for (CartItem cartItem : cartItems) {
            String productType = cartItem.getProductType();
            String title = cartItem.getTitle();
            BigDecimal unitPrice = cartItem.getPrice();
            var storeProduct = productRepository.findBySlug(cartItem.getProductId()).orElse(null);
            if (storeProduct != null) {
                if (!storeProduct.isActive()) {
                    throw new BadRequestException(
                        "'" + storeProduct.getTitle() + "' is no longer available. Remove it from your cart to continue.");
                }
                title = storeProduct.getTitle();
                unitPrice = storeProduct.isFree() ? BigDecimal.ZERO : storeProduct.getPrice();
                currency = storeProduct.getCurrency();
                productType = "BLUEPRINT";
            } else if ("ACADEMY".equalsIgnoreCase(productType)) {
                // Academy membership is priced server-side from settings —
                // the client-sent price is never trusted (a tampered cart
                // once could have bought membership for a penny).
                if (!settingsService.getBool("ACADEMY_PRE_PURCHASE_ENABLED", false)) {
                    throw new BadRequestException("Academy membership is not available right now.");
                }
                title = "Gymholic Academy Membership";
                unitPrice = new BigDecimal(settingsService.getString(
                    "ACADEMY_MEMBERSHIP_PRICE", "29"));
                productType = "ACADEMY";
            } else {
                // Anything that is neither a store product nor the Academy
                // membership has no server-side price — refuse it outright.
                throw new BadRequestException(
                    "'" + title + "' is not available for purchase. Remove it from your cart to continue.");
            }
            total = total.add(unitPrice);
            items.add(orderItemRepository.save(OrderItem.builder()
                .order(saved)
                .productId(cartItem.getProductId())
                .productType(productType)
                .title(title)
                .unitPrice(unitPrice)
                .quantity(1)
                .build()));
        }

        saved.setTotal(total);
        saved.setCurrency(currency);
        return orderRepository.save(saved);
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
