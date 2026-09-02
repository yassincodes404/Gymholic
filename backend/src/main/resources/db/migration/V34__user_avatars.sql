-- Profile pictures: the image bytes live in their own table (same pattern
-- as product_files) and users.profile_image_url points at the public
-- serving endpoint, versioned for cache-busting.
CREATE TABLE IF NOT EXISTS user_avatars (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    data BYTEA NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
