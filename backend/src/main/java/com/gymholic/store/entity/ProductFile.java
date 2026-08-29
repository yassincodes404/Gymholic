package com.gymholic.store.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/** A stored binary (cover image or PDF payload) owned by a product. */
@Entity
@Table(name = "product_files")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    // Hibernate 6 binds @Lob byte[] as a Postgres large-object OID (bigint);
    // the column is BYTEA, so map it explicitly as a varbinary instead.
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(nullable = false, columnDefinition = "BYTEA")
    private byte[] data;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
