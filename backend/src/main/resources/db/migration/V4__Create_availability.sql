-- V4__Create_availability.sql

CREATE TABLE availability (
    id BIGSERIAL PRIMARY KEY,
    trainer_id BIGINT NOT NULL REFERENCES users(id),
    day_of_week VARCHAR(20),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    recurring BOOLEAN NOT NULL DEFAULT TRUE,
    specific_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_availability_trainer_id ON availability(trainer_id);
