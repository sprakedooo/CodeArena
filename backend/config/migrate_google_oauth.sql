-- ============================================================================
-- MIGRATION: Add Google OAuth columns to users table
-- Compatible with MySQL 5.7+
-- Usage: mysql -u root -p codearena < migrate_google_oauth.sql
-- ============================================================================

USE codearena;

-- Add `google_id` column (skip if already exists)
SET @col1 = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'codearena' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'google_id'
);
SET @sql1 = IF(@col1 = 0,
    'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) DEFAULT NULL',
    "SELECT 'google_id column already exists' AS info"
);
PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;

-- Add `avatar` column (skip if already exists)
SET @col2 = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'codearena' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
);
SET @sql2 = IF(@col2 = 0,
    'ALTER TABLE users ADD COLUMN avatar VARCHAR(512) DEFAULT NULL',
    "SELECT 'avatar column already exists' AS info"
);
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;

-- Add unique index on google_id (so lookups are fast and duplicates prevented)
SET @idx = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'codearena' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_google_id'
);
SET @sql3 = IF(@idx = 0,
    'ALTER TABLE users ADD UNIQUE INDEX idx_google_id (google_id)',
    "SELECT 'google_id index already exists' AS info"
);
PREPARE s3 FROM @sql3; EXECUTE s3; DEALLOCATE PREPARE s3;

-- Also make password nullable (Google OAuth users have no password)
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT NULL;

SELECT 'Google OAuth migration complete!' AS status;
DESCRIBE users;
