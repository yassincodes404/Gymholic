package com.gymholic.store;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.store.dto.CategoryDto;
import com.gymholic.store.dto.ProductDetailDto;
import com.gymholic.store.dto.ProductSummaryDto;
import com.gymholic.store.dto.SaveCategoryRequest;
import com.gymholic.store.dto.SaveProductRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Store catalogue management (admin only). */
@RestController
@RequestMapping("/api/store/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class StoreAdminController {

    private final StoreService storeService;

    // ---- Categories ----

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CategoryDto>>> categories() {
        return ResponseEntity.ok(ApiResponse.success(storeService.listAllCategories()));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<CategoryDto>> createCategory(@Valid @RequestBody SaveCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Category created", storeService.createCategory(request)));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<CategoryDto>> updateCategory(
            @PathVariable Long id, @Valid @RequestBody SaveCategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Category updated", storeService.updateCategory(id, request)));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        storeService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Category deleted", null));
    }

    // ---- Products ----

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<ProductSummaryDto>>> products() {
        return ResponseEntity.ok(ApiResponse.success(storeService.listAllProducts()));
    }

    @PostMapping("/products")
    public ResponseEntity<ApiResponse<ProductDetailDto>> createProduct(@Valid @RequestBody SaveProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Product created", storeService.createProduct(request)));
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<ApiResponse<ProductDetailDto>> updateProduct(
            @PathVariable Long id, @Valid @RequestBody SaveProductRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Product updated", storeService.updateProduct(id, request)));
    }

    /** Soft delete (active=false) — order history keeps its product ids. */
    @DeleteMapping("/products/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        storeService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product removed from the store", null));
    }

    /** Permanent delete — wipes the product and its files; not undoable. */
    @DeleteMapping("/products/{id}/purge")
    public ResponseEntity<ApiResponse<Void>> purgeProduct(@PathVariable Long id) {
        storeService.purgeProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product permanently deleted", null));
    }

    // ---- Uploads ----

    @PostMapping("/products/{id}/cover")
    public ResponseEntity<ApiResponse<ProductSummaryDto>> uploadCover(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success("Cover uploaded", storeService.uploadCover(id, file)));
    }

    @PostMapping("/products/{id}/pdf")
    public ResponseEntity<ApiResponse<ProductSummaryDto>> uploadPdf(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success("PDF uploaded", storeService.uploadPdf(id, file)));
    }
}
