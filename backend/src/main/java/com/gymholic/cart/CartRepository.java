package com.gymholic.cart;

import com.gymholic.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByUserIdOrderByCreatedAtAsc(Long userId);

    Optional<CartItem> findByUserIdAndProductId(Long userId, String productId);

    void deleteByUserId(Long userId);

    List<CartItem> findAllByOrderByUserIdAscCreatedAtAsc();
}
