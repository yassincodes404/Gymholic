package com.gymholic.order;

import com.gymholic.order.entity.Order;
import com.gymholic.order.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderId(Long orderId);

    /** Canonical product ids (slugs) the user has bought with orders in the given status. */
    @Query("SELECT DISTINCT oi.productId FROM OrderItem oi " +
           "WHERE oi.order.user.id = :userId AND oi.order.status = :status")
    List<String> findPurchasedProductIds(@Param("userId") Long userId, @Param("status") Order.Status status);

    /** Whether the user owns the given canonical product id (store PDF access check). */
    @Query("SELECT COUNT(oi) > 0 FROM OrderItem oi " +
           "WHERE oi.order.user.id = :userId AND oi.order.status = :status AND oi.productId = :productId")
    boolean existsPurchasedProduct(@Param("userId") Long userId,
                                   @Param("productId") String productId,
                                   @Param("status") Order.Status status);
}
