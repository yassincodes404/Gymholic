ALTER TABLE bookings ADD COLUMN assessment_id UUID;

ALTER TABLE bookings ADD CONSTRAINT fk_booking_assessment 
    FOREIGN KEY (assessment_id) 
    REFERENCES assessments(id) 
    ON DELETE SET NULL;
