package com.gymholic.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.cart.CartRepository;
import com.gymholic.cart.entity.CartItem;
import com.gymholic.common.enums.Role;
import com.gymholic.order.OrderRepository;
import com.gymholic.store.entity.Category;
import com.gymholic.store.entity.Product;
import com.gymholic.store.repository.CategoryRepository;
import com.gymholic.store.repository.ProductRepository;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Blueprint PDF store: public browsing, protected PDF streaming (free OR
 * purchased), the user library, admin catalogue management with upload
 * validation, and server-side price enforcement at checkout.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class StoreIntegrationTest {

    private static final byte[] SAMPLE_PDF = ("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        + "2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF").getBytes();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StoreService storeService;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private OrderRepository orderRepository;

    private User admin;
    private User buyer;
    private Category operations;
    private Category sales;
    private Product paidProduct;
    private Product freeProduct;

    @BeforeEach
    void setUp() {
        admin = userRepository.save(User.builder()
                .email("storeadmin@gymholic.com").firstName("Store").lastName("Admin")
                .password("password").role(Role.ADMIN).timezone("UTC").active(true).build());
        buyer = userRepository.save(User.builder()
                .email("storebuyer@gymholic.com").firstName("Store").lastName("Buyer")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());

        operations = categoryRepository.save(Category.builder()
                .name("Operations").slug("operations").sortOrder(1).build());
        sales = categoryRepository.save(Category.builder()
                .name("Sales").slug("sales").sortOrder(2).build());

        paidProduct = productRepository.save(Product.builder()
                .slug("operations-blueprint").title("Gym Operations Blueprint")
                .shortDescription("Complete daily, weekly and monthly gym operating system.")
                .description("Long description of the operating system.")
                .category(operations).price(new BigDecimal("49.00")).build());
        freeProduct = productRepository.save(Product.builder()
                .slug("sample-blueprint").title("Sample Blueprint")
                .shortDescription("A free sample.")
                .category(sales).price(BigDecimal.ZERO).free(true).build());

        // Both products carry a PDF so the streaming endpoints are exercisable.
        storeService.uploadPdf(paidProduct.getId(),
                new MockMultipartFile("file", "operations.pdf", "application/pdf", SAMPLE_PDF));
        storeService.uploadPdf(freeProduct.getId(),
                new MockMultipartFile("file", "sample.pdf", "application/pdf", SAMPLE_PDF));
    }

    // ---- Public browsing ----

    @Test
    void categoriesAndProducts_ArePublic() throws Exception {
        mockMvc.perform(get("/api/store/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].slug", containsInAnyOrder("operations", "sales")));

        mockMvc.perform(get("/api/store/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[?(@.slug == 'operations-blueprint')].price").value(49.0));

        // Category filter + search
        mockMvc.perform(get("/api/store/products").param("category", "operations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].slug").value("operations-blueprint"));
        mockMvc.perform(get("/api/store/products").param("search", "sample"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].slug").value("sample-blueprint"));
    }

    @Test
    void productDetail_IncludesRelated_FromSameCategoryThenOthers() throws Exception {
        productRepository.save(Product.builder().slug("ops-two").title("Ops Two")
                .category(operations).price(new BigDecimal("19.00")).build());
        productRepository.save(Product.builder().slug("ops-three").title("Ops Three")
                .category(operations).price(new BigDecimal("19.00")).build());
        productRepository.save(Product.builder().slug("sales-two").title("Sales Two")
                .category(sales).price(new BigDecimal("19.00")).build());

        mockMvc.perform(get("/api/store/products/{slug}", "operations-blueprint"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Gym Operations Blueprint"))
                .andExpect(jsonPath("$.data.description").isNotEmpty())
                .andExpect(jsonPath("$.data.related.length()").value(4))
                .andExpect(jsonPath("$.data.related[?(@.slug == 'ops-two')]").exists())
                .andExpect(jsonPath("$.data.related[?(@.slug == 'ops-three')]").exists())
                .andExpect(jsonPath("$.data.related[?(@.slug == 'sales-two')]").exists())
                .andExpect(jsonPath("$.data.related[?(@.slug == 'operations-blueprint')]").doesNotExist());
    }

    @Test
    void unknownSlug_404() throws Exception {
        mockMvc.perform(get("/api/store/products/does-not-exist"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "storeadmin@gymholic.com", authorities = {"ROLE_ADMIN"})
    void coverImage_IsPublicAndInline() throws Exception {
        // Upload the cover as admin, then fetch it as an unauthenticated guest.
        mockMvc.perform(multipart("/api/store/admin/products/{id}/cover", paidProduct.getId())
                        .file(new MockMultipartFile("file", "cover.png", "image/png", new byte[]{1, 2, 3})))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/store/products/{slug}/cover", "operations-blueprint"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(header().string("Content-Disposition", startsWith("inline;")));
    }

    // ---- Protected PDF ----

    @Test
    void pdf_Unauthenticated_401() throws Exception {
        mockMvc.perform(get("/api/store/products/{slug}/pdf", "sample-blueprint"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "storebuyer@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void pdf_PaidNotOwned_403() throws Exception {
        mockMvc.perform(get("/api/store/products/{slug}/pdf", "operations-blueprint"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "storebuyer@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void pdf_FreeProduct_StreamsInlineNoStore() throws Exception {
        mockMvc.perform(get("/api/store/products/{slug}/pdf", "sample-blueprint"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", startsWith("inline;")))
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    @WithMockUser(username = "storebuyer@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void pdf_OwnedByPaidOrder_Streams() throws Exception {
        // A PAID order with an order item carrying the canonical slug id grants access.
        cartRepository.save(CartItem.builder().user(buyer)
                .productId("operations-blueprint").productType("BLUEPRINT")
                .title("Gym Operations Blueprint").price(new BigDecimal("0.01")).build());
        mockMvc.perform(post("/api/orders"))
                .andExpect(status().isCreated());
        assertThat(orderRepository.count()).isEqualTo(1);

        mockMvc.perform(get("/api/store/products/{slug}/pdf", "operations-blueprint"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    // ---- Library ----

    @Test
    @WithMockUser(username = "storebuyer@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void library_ListsFreeProductsAndPurchases() throws Exception {
        cartRepository.save(CartItem.builder().user(buyer)
                .productId("operations-blueprint").productType("BLUEPRINT")
                .title("Gym Operations Blueprint").price(new BigDecimal("49.00")).build());
        mockMvc.perform(post("/api/orders")).andExpect(status().isCreated());

        mockMvc.perform(get("/api/store/library"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[?(@.slug == 'sample-blueprint')].owned").value(false))
                .andExpect(jsonPath("$.data[?(@.slug == 'operations-blueprint')].owned").value(true));
    }

    // ---- Admin ----

    @Test
    @WithMockUser(username = "storeadmin@gymholic.com", authorities = {"ROLE_ADMIN"})
    void admin_CategoryCrud_AndReferencedDeleteBlocked() throws Exception {
        mockMvc.perform(get("/api/store/admin/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));

        String created = mockMvc.perform(post("/api/store/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"Finance\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.slug").value("finance"))
                .andReturn().getResponse().getContentAsString();
        long financeId = objectMapper.readTree(created).path("data").path("id").asLong();

        mockMvc.perform(put("/api/store/admin/categories/{id}", financeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"Finance & KPIs\", \"active\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("finance-kpis"));

        // Deleting the empty category works; one referenced by products is refused.
        mockMvc.perform(delete("/api/store/admin/categories/{id}", financeId))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/store/admin/categories/{id}", operations.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("product")));
    }

    @Test
    @WithMockUser(username = "storeadmin@gymholic.com", authorities = {"ROLE_ADMIN"})
    void admin_ProductCrud_SoftDelete() throws Exception {
        String created = mockMvc.perform(post("/api/store/admin/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"title": "KPI Dashboard", "categoryId": %d, "price": 39.00,
                                 "shortDescription": "KPIs.", "isFree": false, "featured": true}
                                """, sales.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.slug").value("kpi-dashboard"))
                .andReturn().getResponse().getContentAsString();
        long productId = objectMapper.readTree(created).path("data").path("id").asLong();

        mockMvc.perform(put("/api/store/admin/products/{id}", productId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"title": "KPI Dashboard v2", "categoryId": %d, "price": 45.00, "isFree": false}
                                """, sales.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("kpi-dashboard-v2"));

        // Soft delete: gone from the public list, still readable by admin.
        mockMvc.perform(delete("/api/store/admin/products/{id}", productId))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/store/products/kpi-dashboard-v2"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/store/admin/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.slug == 'kpi-dashboard-v2')].hasCover").exists());
    }

    @Test
    @WithMockUser(username = "storeadmin@gymholic.com", authorities = {"ROLE_ADMIN"})
    void admin_Uploads_Validated() throws Exception {
        // Cover: wrong type rejected
        mockMvc.perform(multipart("/api/store/admin/products/{id}/cover", paidProduct.getId())
                        .file(new MockMultipartFile("file", "doc.pdf", "application/pdf", SAMPLE_PDF)))
                .andExpect(status().isBadRequest());
        // PDF: wrong type rejected
        mockMvc.perform(multipart("/api/store/admin/products/{id}/pdf", paidProduct.getId())
                        .file(new MockMultipartFile("file", "cover.png", "image/png", new byte[]{1, 2, 3})))
                .andExpect(status().isBadRequest());
        // Happy paths
        mockMvc.perform(multipart("/api/store/admin/products/{id}/cover", paidProduct.getId())
                        .file(new MockMultipartFile("file", "cover.png", "image/png", new byte[]{1, 2, 3})))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasCover").value(true));
        mockMvc.perform(multipart("/api/store/admin/products/{id}/pdf", paidProduct.getId())
                        .file(new MockMultipartFile("file", "blueprint.pdf", "application/pdf", SAMPLE_PDF)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasPdf").value(true));
    }

    @Test
    @WithMockUser(username = "storebuyer@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void adminEndpoints_ForbiddenForClients() throws Exception {
        mockMvc.perform(get("/api/store/admin/products"))
                .andExpect(status().isForbidden());
    }

    // ---- Checkout price enforcement ----

    @Test
    @WithMockUser(username = "storebuyer@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void checkout_EnforcesStorePriceOverTamperedCartPrice() throws Exception {
        // Tampered cart price: 0.01 for a 49.00 product.
        cartRepository.save(CartItem.builder().user(buyer)
                .productId("operations-blueprint").productType("BLUEPRINT")
                .title("Gym Operations Blueprint").price(new BigDecimal("0.01")).build());

        MvcResult result = mockMvc.perform(post("/api/orders"))
                .andExpect(status().isCreated())
                .andReturn();
        com.fasterxml.jackson.databind.JsonNode order = objectMapper
                .readTree(result.getResponse().getContentAsString()).path("data");

        assertThat(order.path("total").asDouble()).isEqualTo(49.0);
        assertThat(order.path("items").get(0).path("unitPrice").asDouble()).isEqualTo(49.0);
        assertThat(order.path("items").get(0).path("title").asText()).isEqualTo("Gym Operations Blueprint");

        // Library now shows ownership, granting PDF access.
        mockMvc.perform(get("/api/store/products/{slug}/pdf", "operations-blueprint"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "storebuyer@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void checkout_InactiveStoreProduct_Rejected() throws Exception {
        paidProduct.setActive(false);
        productRepository.save(paidProduct);
        cartRepository.save(CartItem.builder().user(buyer)
                .productId("operations-blueprint").productType("BLUEPRINT")
                .title("Gym Operations Blueprint").price(new BigDecimal("49.00")).build());

        mockMvc.perform(post("/api/orders"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("no longer available")));
    }

    // ---- helpers ----
}
