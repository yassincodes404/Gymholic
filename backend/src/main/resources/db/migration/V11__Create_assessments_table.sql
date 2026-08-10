CREATE TABLE assessments (
    id UUID PRIMARY KEY,
    user_id BIGINT,
    user_type VARCHAR(50) NOT NULL,
    current_stage VARCHAR(50),
    situation VARCHAR(500),
    start_timing VARCHAR(50),
    preferred_consultation VARCHAR(50),
    preferred_language VARCHAR(50),
    best_time_to_contact VARCHAR(100),
    full_name VARCHAR(255),
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    details JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Add index on user_id for faster lookups
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
-- Add index on status for admin dashboard filtering
CREATE INDEX idx_assessments_status ON assessments(status);
