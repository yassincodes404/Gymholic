package com.gymholic.config;

import com.gymholic.store.entity.Category;
import com.gymholic.store.entity.Product;
import com.gymholic.store.entity.ProductFile;
import com.gymholic.store.repository.CategoryRepository;
import com.gymholic.store.repository.ProductFileRepository;
import com.gymholic.store.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;
import java.util.List;

/**
 * Dev-only: seeds the Blueprint store with categories and products, each
 * carrying a generated multi-page PDF (and a generated PNG cover) so the
 * storefront, viewer and admin uploads can be exercised immediately.
 */
@Configuration
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevStoreSeeder {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductFileRepository productFileRepository;

    @Bean
    public CommandLineRunner seedDevStore() {
        return args -> {
            try {
                seed();
            } catch (Exception e) {
                // A seeder failure must never crash-loop the application.
                log.error("Dev store seeding failed (continuing startup): {}", e.getMessage(), e);
            }
        };
    }

    private void seed() throws Exception {
        if (productRepository.count() > 0) {
            log.info("Store already has products. Skipping dev store seed.");
            return;
        }

        // Reuse categories that already exist (a previously failed seed may
        // have committed categories before failing on products).
        Category operations = category("operations", "Operations",
            "Day-to-day gym operating systems", 1);
        Category staff = category("staff", "Staff",
            "Hiring, schedules and accountability", 2);
        Category sales = category("sales", "Sales",
            "Membership sales systems", 3);
        Category retention = category("retention", "Retention",
            "Keeping members longer", 4);
        Category finance = category("finance", "Finance",
            "KPIs, budgets and pricing", 5);

        record Seed(String slug, String title, String shortDescription, String description,
                    Category category, String price, boolean free, boolean featured) {}

        List<Seed> seeds = List.of(
            new Seed("sample-blueprint", "Sample Blueprint",
                "A free sample so you can try the secure viewer.",
                "This free sample Blueprint walks through the Gymholic format: operating systems, "
                    + "templates and checklists you can put to work in your gym today.",
                operations, "0", true, true),
            new Seed("gym-operations-blueprint", "Gym Operations Blueprint",
                "Complete daily, weekly and monthly gym operating system.",
                "Opening and closing routines, floor management, maintenance schedules and the "
                    + "monthly operating cadence — the full day-to-day system for a profitable gym.",
                operations, "49", false, true),
            new Seed("staff-management-system", "Staff Management System",
                "Schedules, responsibilities, reporting and accountability templates.",
                "Shift systems, role scorecards, onboarding paths and accountability meetings that "
                    + "keep a gym team aligned and productive.",
                staff, "39", false, false),
            new Seed("pt-sales-system", "PT Sales System",
                "Trainer sales process, follow-up system and performance tracking.",
                "A complete personal-training sales pipeline: consult structure, follow-up cadence, "
                    + "objection handling and performance dashboards.",
                sales, "49", false, false),
            new Seed("member-retention-blueprint", "Member Retention Blueprint",
                "A complete retention workflow for at-risk members.",
                "Identify, track and recover at-risk members with check-in data, engagement scoring "
                    + "and win-back campaigns.",
                retention, "59", false, false),
            new Seed("gym-kpi-dashboard", "Gym KPI Dashboard",
                "Operational and financial KPI tracking framework.",
                "The numbers that matter on one page: leads, conversions, churn, revenue per member "
                    + "and the weekly review routine.",
                finance, "0", true, false));

        int variant = 0;
        int created = 0;
        for (Seed seed : seeds) {
            if (productRepository.existsBySlug(seed.slug())) {
                continue;
            }

            ProductFile pdf = productFileRepository.save(ProductFile.builder()
                .fileName(seed.slug() + ".pdf")
                .contentType("application/pdf")
                .fileSize(0)
                .data(com.gymholic.store.DevSeedMedia.samplePdf(seed.title(), 2))
                .build());
            pdf.setFileSize(pdf.getData().length);
            productFileRepository.save(pdf);

            ProductFile cover = productFileRepository.save(ProductFile.builder()
                .fileName(seed.slug() + ".png")
                .contentType("image/png")
                .fileSize(0)
                .data(com.gymholic.store.DevSeedMedia.coverPng(variant++))
                .build());
            cover.setFileSize(cover.getData().length);
            productFileRepository.save(cover);

            productRepository.save(Product.builder()
                .slug(seed.slug())
                .title(seed.title())
                .shortDescription(seed.shortDescription())
                .description(seed.description())
                .category(seed.category())
                .price(new BigDecimal(seed.price()))
                .free(seed.free())
                .featured(seed.featured())
                .pdfFile(pdf)
                .coverFile(cover)
                .build());
            created++;
        }

        log.info("✓ Seeded the dev store: 5 categories, {} products (2 free) with generated PDFs + covers", created);
    }

    private Category category(String slug, String name, String description, int sortOrder) {
        return categoryRepository.findBySlug(slug)
            .orElseGet(() -> categoryRepository.save(Category.builder()
                .name(name).slug(slug).description(description)
                .sortOrder(sortOrder).build()));
    }
}
