package com.gymholic.store;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import com.gymholic.store.dto.CategoryDto;
import com.gymholic.store.dto.LibraryItemDto;
import com.gymholic.store.dto.ProductDetailDto;
import com.gymholic.store.dto.ProductSummaryDto;
import com.gymholic.store.entity.ProductFile;
import com.gymholic.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public storefront: category/product browsing and cover images work for
 * guests; the PDF stream and the library require a signed-in user.
 */
@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;
    private final UserRepository userRepository;

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CategoryDto>>> categories() {
        return ResponseEntity.ok(ApiResponse.success(storeService.listActiveCategories()));
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<ProductSummaryDto>>> products(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(storeService.listProducts(category, search)));
    }

    @GetMapping("/products/{slug}")
    public ResponseEntity<ApiResponse<ProductDetailDto>> productDetail(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(storeService.getProductDetail(slug)));
    }

    /** Public inline cover image. */
    @GetMapping("/products/{slug}/cover")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> cover(@PathVariable String slug) {
        ProductFile cover = storeService.getCover(slug);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(cover.getContentType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + cover.getFileName() + "\"")
            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
            .body(cover.getData());
    }

    /**
     * Protected PDF stream: authenticated AND (free product OR purchased).
     * Rendered inline only — no-store so the blob never lingers in caches.
     */
    @GetMapping("/products/{slug}/pdf")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> pdf(@PathVariable String slug) {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(401).build();
        }
        Long userId = userRepository.findByEmail(email)
            .orElseThrow(() -> new com.gymholic.common.exception.ResourceNotFoundException("User", "email", email))
            .getId();
        ProductFile pdf = storeService.getPdfForUser(slug, userId);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + pdf.getFileName() + "\"")
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(pdf.getData());
    }

    /** The signed-in user's library: free products plus purchases. */
    @GetMapping("/library")
    public ResponseEntity<ApiResponse<List<LibraryItemDto>>> library() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) throw new IllegalStateException("Not authenticated");
        Long userId = userRepository.findByEmail(email)
            .orElseThrow(() -> new com.gymholic.common.exception.ResourceNotFoundException("User", "email", email))
            .getId();
        return ResponseEntity.ok(ApiResponse.success(storeService.getLibrary(userId)));
    }
}
