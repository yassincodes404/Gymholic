-- V2__Create_roles.sql
-- Role is handled via an Enum in the User entity, so we don't strictly need a roles table
-- unless we want dynamic RBAC. For this skeleton, we'll just insert an admin user.

-- Note: Passwords must be bcrypt hashed. 
-- 'password' is the raw string for the hash below.
INSERT INTO users (email, password, first_name, last_name, role, active, created_at)
VALUES (
    'admin@gymholic.com', 
    '$2a$10$c1x.6Gf5Wl6B.95/Gq.Yg.0.xZ8X2y4K.p45/0Ww.k3C8D.B5X6iG', -- password
    'Admin', 
    'User', 
    'ADMIN', 
    true, 
    CURRENT_TIMESTAMP
);
