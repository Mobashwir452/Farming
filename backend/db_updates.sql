-- 1. Add notes_json column to crops table for storing progress notes
ALTER TABLE crops ADD COLUMN notes_json TEXT DEFAULT '[]';

-- 2. Create the unified admin settings table for API keys and global configs
CREATE TABLE IF NOT EXISTS admin_settings (
    key_name TEXT PRIMARY KEY,
    key_value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed necessary settings records
INSERT OR IGNORE INTO admin_settings (key_name, key_value) VALUES ('weather_api_key', '');
