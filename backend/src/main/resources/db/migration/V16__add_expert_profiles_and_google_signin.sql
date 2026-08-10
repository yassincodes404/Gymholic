-- Add googleId to users table for Google Sign-In support
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
CREATE INDEX idx_users_google_id ON users(google_id);

-- Create expert_profiles table for business profile information
CREATE TABLE expert_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_type VARCHAR(50),
    business_name VARCHAR(255),
    description TEXT,
    years_of_experience INTEGER,
    specializations TEXT,
    certifications TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expert_profiles_user_id ON expert_profiles(user_id);

-- Add comments for documentation
COMMENT ON TABLE expert_profiles IS 'Expert business profiles for trainers and gym owners';
COMMENT ON COLUMN users.google_id IS 'Google user ID for Google Sign-In integration';
COMMENT ON COLUMN expert_profiles.business_type IS 'Type of business: GYM_OWNER, PERSONAL_TRAINER, etc.';
