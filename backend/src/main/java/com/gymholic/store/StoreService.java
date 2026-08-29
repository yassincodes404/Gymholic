package com.gymholic.store;

import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.order.OrderItemRepository;
import com.gymholic.order.entity.Order;
import com.gymholic.order.entity.OrderItem;
import com.gymholic.store.dto.CategoryDto;
import com.gymholic.store.dto.LibraryItemDto;
import com.gymholic.store.dto.ProductDetailDto;
import com.gymholic.store.dto.ProductSummaryDto;
import com.gymholic.store.dto.SaveCategoryRequest;
import com.gymholic.store.dto.SaveProductRequest;
import com.gymholic.store.entity.Category;
import com.gymholic.store.entity.Product;
import com.gymholic.store.entity.ProductFile;
import com.gymholic.store.repository.CategoryRepository;
import com.gymholic.store.repository.ProductFileRepository;
import com.gymholic.store.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreService {

    private static final long MAX_COVER_BYTES = 5L * 1024 * 1024;
    private static final long MAX_PDF_BYTES = 25L * 1024 * 1024;
    private static final int RELATED_COUNT = 4;

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductFileRepository productFileRepository;
    private final OrderItemRepository orderItemRepository;

    // ---- Public browsing ----

    @Transactional(readOnly = true)
    public List<CategoryDto> listActiveCategories() {
        return categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc()
            .stream().map(this::toCategoryDto).toList();
    }

    /** Active products, optionally narrowed to a category slug and a free-text search. */
    @Transactional(readOnly = true)
    public List<ProductSummaryDto> listProducts(String categorySlug, String search) {
        String needle = search == null ? null : search.trim().toLowerCase(Locale.ROOT);
        return productRepository.findByActiveTrueOrderByFeaturedDescIdAsc().stream()
            .filter(p -> categorySlug == null || categorySlug.isBlank()
                || (p.getCategory() != null && categorySlug.equalsIgnoreCase(p.getCategory().getSlug())))
            .filter(p -> needle == null || needle.isEmpty()
                || containsIgnoreCase(p.getTitle(), needle)
                || containsIgnoreCase(p.getShortDescription(), needle))
            .map(this::toSummaryDto)
            .toList();
    }

    private static boolean containsIgnoreCase(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }

    @Transactional(readOnly = true)
    public ProductDetailDto getProductDetail(String slug) {
        Product product = requireActiveProduct(slug);
        List<Product> related = relatedProducts(product);
        return toDetailDto(product, related);
    }

    /** Four same-category actives, backfilled with other actives when the category runs short. */
    private List<Product> relatedProducts(Product product) {
        List<Product> related = new ArrayList<>();
        if (product.getCategory() != null) {
            related.addAll(productRepository.findByCategoryIdAndActiveTrueAndIdNotOrderByFeaturedDescIdAsc(
                product.getCategory().getId(), product.getId()));
        }
        if (related.size() < RELATED_COUNT) {
            Set<Long> seen = new HashSet<>();
            seen.add(product.getId());
            for (Product candidate : productRepository.findByActiveTrueAndIdNotOrderByFeaturedDescIdAsc(product.getId())) {
                if (related.size() >= RELATED_COUNT) break;
                if (seen.add(candidate.getId()) && related.stream().noneMatch(r -> r.getId().equals(candidate.getId()))) {
                    related.add(candidate);
                }
            }
        }
        return related.size() > RELATED_COUNT ? related.subList(0, RELATED_COUNT) : related;
    }

    @Transactional(readOnly = true)
    public ProductFile getCover(String slug) {
        Product product = requireActiveProduct(slug);
        if (product.getCoverFile() == null) {
            throw new ResourceNotFoundException("Cover image", "product", slug);
        }
        return product.getCoverFile();
    }

    /**
     * Streams the PDF to the signed-in user. Access requires the product to
     * be free OR the user to own it (a PAID order item with this product's
     * canonical slug id).
     */
    @Transactional(readOnly = true)
    public ProductFile getPdfForUser(String slug, Long userId) {
        Product product = requireActiveProduct(slug);
        if (product.getPdfFile() == null) {
            throw new ResourceNotFoundException("PDF file", "product", slug);
        }
        if (!product.isFree() && !ownsProduct(userId, slug)) {
            throw new org.springframework.security.access.AccessDeniedException(
                "Purchase this blueprint to open it.");
        }
        return product.getPdfFile();
    }

    private boolean ownsProduct(Long userId, String slug) {
        return orderItemRepository.existsPurchasedProduct(userId, slug, Order.Status.PAID);
    }

    /**
     * The signed-in user's library: every free active product plus every
     * purchased (PAID order item) active product.
     */
    @Transactional(readOnly = true)
    public List<LibraryItemDto> getLibrary(Long userId) {
        Set<String> purchased = new HashSet<>(
            orderItemRepository.findPurchasedProductIds(userId, Order.Status.PAID));

        Map<String, Product> bySlug = new LinkedHashMap<>();
        for (Product free : productRepository.findByActiveTrueAndFreeTrue()) {
            bySlug.put(free.getSlug(), free);
        }
        for (Product owned : productRepository.findBySlugInAndActiveTrue(purchased)) {
            bySlug.put(owned.getSlug(), owned);
        }

        return bySlug.values().stream()
            .map(p -> LibraryItemDto.builder()
                .slug(p.getSlug())
                .title(p.getTitle())
                .shortDescription(p.getShortDescription())
                .price(p.getPrice())
                .currency(p.getCurrency())
                .isFree(p.isFree())
                .featured(p.isFeatured())
                .hasCover(p.getCoverFile() != null)
                .hasPdf(p.getPdfFile() != null)
                .category(toCategoryRef(p))
                .owned(purchased.contains(p.getSlug()))
                .build())
            .toList();
    }

    // ---- Admin: categories ----

    @Transactional(readOnly = true)
    public List<CategoryDto> listAllCategories() {
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc()
            .stream().map(this::toCategoryDto).toList();
    }

    @Transactional
    public CategoryDto createCategory(SaveCategoryRequest request) {
        String slug = slugify(request.getSlug() != null && !request.getSlug().isBlank()
            ? request.getSlug() : request.getName());
        if (categoryRepository.existsBySlug(slug)) {
            throw new BadRequestException("A category with slug '" + slug + "' already exists.");
        }
        Category saved = categoryRepository.save(Category.builder()
            .name(request.getName().trim())
            .slug(slug)
            .description(request.getDescription())
            .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
            .active(request.getActive() == null || request.getActive())
            .build());
        return toCategoryDto(saved);
    }

    @Transactional
    public CategoryDto updateCategory(Long id, SaveCategoryRequest request) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        String slug = slugify(request.getSlug() != null && !request.getSlug().isBlank()
            ? request.getSlug() : request.getName());
        if (categoryRepository.existsBySlugAndIdNot(slug, id)) {
            throw new BadRequestException("A category with slug '" + slug + "' already exists.");
        }
        category.setName(request.getName().trim());
        category.setSlug(slug);
        category.setDescription(request.getDescription());
        category.setSortOrder(request.getSortOrder() == null ? category.getSortOrder() : request.getSortOrder());
        if (request.getActive() != null) {
            category.setActive(request.getActive());
        }
        return toCategoryDto(categoryRepository.save(category));
    }

    /** Soft-free categories would hide them; deleting is refused while products still reference one. */
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        long referenced = productRepository.findAllByOrderByFeaturedDescIdAsc().stream()
            .filter(p -> p.getCategory() != null && p.getCategory().getId().equals(id))
            .count();
        if (referenced > 0) {
            throw new BadRequestException(
                "This category still has " + referenced + " product(s). Move or delete them first.");
        }
        categoryRepository.delete(category);
    }

    // ---- Admin: products ----

    @Transactional(readOnly = true)
    public List<ProductSummaryDto> listAllProducts() {
        return productRepository.findAllByOrderByFeaturedDescIdAsc()
            .stream().map(this::toSummaryDto).toList();
    }

    @Transactional
    public ProductDetailDto createProduct(SaveProductRequest request) {
        String slug = slugify(request.getSlug() != null && !request.getSlug().isBlank()
            ? request.getSlug() : request.getTitle());
        if (productRepository.findBySlug(slug).isPresent()) {
            throw new BadRequestException("A product with slug '" + slug + "' already exists.");
        }
        Category category = requireCategory(request.getCategoryId());
        Product saved = productRepository.save(Product.builder()
            .slug(slug)
            .title(request.getTitle().trim())
            .shortDescription(request.getShortDescription())
            .description(request.getDescription())
            .category(category)
            .price(request.getPrice())
            .free(Boolean.TRUE.equals(request.getIsFree()))
            .featured(Boolean.TRUE.equals(request.getFeatured()))
            .active(request.getActive() == null || request.getActive())
            .build());
        return toDetailDto(saved, List.of());
    }

    @Transactional
    public ProductDetailDto updateProduct(Long id, SaveProductRequest request) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        // Partial-update friendly: an explicit slug wins, a changed title
        // re-derives it, and an unchanged title keeps the current canonical
        // id (so admin toggles from the products table can never rename —
        // and break purchases pointing at — the product by accident). Null
        // descriptions keep the stored copy (so admin toggles can't blank
        // content).
        String slug = request.getSlug() != null && !request.getSlug().isBlank()
            ? slugify(request.getSlug())
            : request.getTitle().trim().equals(product.getTitle())
                ? product.getSlug()
                : slugify(request.getTitle());
        Product clash = productRepository.findBySlug(slug).orElse(null);
        if (clash != null && !clash.getId().equals(id)) {
            throw new BadRequestException("A product with slug '" + slug + "' already exists.");
        }
        product.setSlug(slug);
        product.setTitle(request.getTitle().trim());
        if (request.getShortDescription() != null) {
            product.setShortDescription(request.getShortDescription());
        }
        if (request.getDescription() != null) {
            product.setDescription(request.getDescription());
        }
        product.setCategory(requireCategory(request.getCategoryId()));
        product.setPrice(request.getPrice());
        product.setFree(Boolean.TRUE.equals(request.getIsFree()));
        product.setFeatured(Boolean.TRUE.equals(request.getFeatured()));
        if (request.getActive() != null) {
            product.setActive(request.getActive());
        }
        return toDetailDto(productRepository.save(product), List.of());
    }

    /** Soft delete: the product disappears from the storefront but past orders keep their ids. */
    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        product.setActive(false);
        productRepository.save(product);
    }

    // ---- Admin: file uploads ----

    /** Stores an image cover (image/*, ≤5MB), links it and replaces the previous file. */
    @Transactional
    public ProductSummaryDto uploadCover(Long productId, MultipartFile file) {
        Product product = requireProduct(productId);
        ProductFile stored = storeFile(file, "image/", MAX_COVER_BYTES, "Cover images must be images up to 5MB.");
        ProductFile previous = product.getCoverFile();
        product.setCoverFile(stored);
        productRepository.save(product);
        deleteFileQuietly(previous);
        return toSummaryDto(product);
    }

    /** Stores the PDF payload (application/pdf, ≤25MB), links it and replaces the previous file. */
    @Transactional
    public ProductSummaryDto uploadPdf(Long productId, MultipartFile file) {
        Product product = requireProduct(productId);
        ProductFile stored = storeFile(file, null, MAX_PDF_BYTES, null);
        if (stored.getContentType() == null || !"application/pdf".equalsIgnoreCase(stored.getContentType())) {
            throw new BadRequestException("Only PDF files up to 25MB can be uploaded.");
        }
        ProductFile previous = product.getPdfFile();
        product.setPdfFile(stored);
        productRepository.save(product);
        deleteFileQuietly(previous);
        return toSummaryDto(product);
    }

    private ProductFile storeFile(MultipartFile file, String requiredPrefix, long maxBytes, String prefixError) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A file is required.");
        }
        String contentType = file.getContentType();
        if (requiredPrefix != null && (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith(requiredPrefix))) {
            throw new BadRequestException(prefixError);
        }
        if (file.getSize() > maxBytes) {
            throw new BadRequestException("File is too large — the limit is " + (maxBytes / (1024 * 1024)) + "MB.");
        }
        try {
            ProductFile stored = ProductFile.builder()
                .fileName(sanitizeFileName(file.getOriginalFilename()))
                .contentType(contentType)
                .fileSize(file.getSize())
                .data(file.getBytes())
                .build();
            return productFileRepository.save(stored);
        } catch (IOException e) {
            throw new BadRequestException("Could not read the uploaded file.");
        }
    }

    private static String sanitizeFileName(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }
        String cleaned = name.replace("\\", "/").substring(name.replace("\\", "/").lastIndexOf('/') + 1);
        return cleaned.isBlank() ? "file" : cleaned;
    }

    private void deleteFileQuietly(ProductFile file) {
        if (file == null) return;
        try {
            productFileRepository.delete(file);
        } catch (Exception e) {
            log.warn("Could not delete replaced product file #{}: {}", file.getId(), e.getMessage());
        }
    }

    // ---- helpers ----

    private Product requireActiveProduct(String slug) {
        Product product = productRepository.findBySlug(slug)
            .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        if (!product.isActive()) {
            throw new ResourceNotFoundException("Product", "slug", slug);
        }
        return product;
    }

    private Product requireProduct(Long id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
    }

    private Category requireCategory(Long id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
    }

    /** kebab-case slug from arbitrary display text. */
    static String slugify(String input) {
        if (input == null || input.isBlank()) {
            throw new BadRequestException("A name or slug is required.");
        }
        String slug = input.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-+|-+$)", "");
        if (slug.isEmpty()) {
            throw new BadRequestException("Could not derive a slug from '" + input + "'.");
        }
        return slug.length() > 120 ? slug.substring(0, 120) : slug;
    }

    private CategoryDto toCategoryDto(Category category) {
        return CategoryDto.builder()
            .id(category.getId())
            .name(category.getName())
            .slug(category.getSlug())
            .description(category.getDescription())
            .sortOrder(category.getSortOrder())
            .active(category.isActive())
            .build();
    }

    private ProductSummaryDto.CategoryRefDto toCategoryRef(Product product) {
        return product.getCategory() == null ? null : ProductSummaryDto.CategoryRefDto.builder()
            .name(product.getCategory().getName())
            .slug(product.getCategory().getSlug())
            .build();
    }

    private ProductSummaryDto toSummaryDto(Product product) {
        return ProductSummaryDto.builder()
            .id(product.getId())
            .slug(product.getSlug())
            .title(product.getTitle())
            .shortDescription(product.getShortDescription())
            .price(product.getPrice())
            .currency(product.getCurrency())
            .isFree(product.isFree())
            .featured(product.isFeatured())
            .hasCover(product.getCoverFile() != null)
            .hasPdf(product.getPdfFile() != null)
            .category(toCategoryRef(product))
            .build();
    }

    private ProductDetailDto toDetailDto(Product product, List<Product> related) {
        return ProductDetailDto.builder()
            .id(product.getId())
            .slug(product.getSlug())
            .title(product.getTitle())
            .shortDescription(product.getShortDescription())
            .description(product.getDescription())
            .price(product.getPrice())
            .currency(product.getCurrency())
            .isFree(product.isFree())
            .featured(product.isFeatured())
            .hasCover(product.getCoverFile() != null)
            .hasPdf(product.getPdfFile() != null)
            .category(toCategoryRef(product))
            .related(related.stream().map(this::toSummaryDto).toList())
            .build();
    }
}
