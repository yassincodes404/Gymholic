package com.gymholic.store.repository;

import com.gymholic.store.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    /** The canonical product id is the slug — used by cart items and orders. */
    Optional<Product> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Product> findByActiveTrueOrderByFeaturedDescIdAsc();

    List<Product> findAllByOrderByFeaturedDescIdAsc();

    List<Product> findByCategoryIdAndActiveTrueAndIdNotOrderByFeaturedDescIdAsc(Long categoryId, Long excludeId);

    List<Product> findByActiveTrueAndIdNotOrderByFeaturedDescIdAsc(Long excludeId);

    List<Product> findBySlugInAndActiveTrue(Collection<String> slugs);

    List<Product> findByActiveTrueAndFreeTrue();
}
