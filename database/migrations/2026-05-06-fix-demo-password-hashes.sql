-- Reset demo-user passwords to known credentials using bcrypt hashes.
-- Credentials:
--   super.admin@crm.demo -> Super@123
--   admin@crm.demo       -> Admin@123
--   employee@crm.demo    -> Employee@123

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE users
SET password_hash = crypt('Super@123', gen_salt('bf'))
WHERE lower(email) = 'super.admin@crm.demo';

UPDATE users
SET password_hash = crypt('Admin@123', gen_salt('bf'))
WHERE lower(email) = 'admin@crm.demo';

UPDATE users
SET password_hash = crypt('Employee@123', gen_salt('bf'))
WHERE lower(email) = 'employee@crm.demo';
