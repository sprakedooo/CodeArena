-- ============================================================================
-- MIGRATION: Add missing columns to users table
-- Compatible with MySQL 5.7+
-- Usage: mysql -u root -p codearena < migrate_users_columns.sql
-- ============================================================================

USE codearena;

-- Add `role` column (skip if already exists)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'codearena'
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'role'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE users ADD COLUMN role ENUM('student','faculty') NOT NULL DEFAULT 'student'",
    "SELECT 'role column already exists' AS info"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add `selected_language` column (skip if already exists)
SET @col_exists2 = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'codearena'
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'selected_language'
);
SET @sql2 = IF(@col_exists2 = 0,
    'ALTER TABLE users ADD COLUMN selected_language VARCHAR(50) DEFAULT NULL',
    "SELECT 'selected_language column already exists' AS info"
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Mark existing sample users as students
UPDATE users SET role = 'student'
WHERE email IN ('student@example.com', 'maria@example.com');

SELECT 'Users table migration complete!' AS status;
SELECT user_id, email, role, selected_language FROM users;
