-- backend/schema/ai_api_keys.sql
-- Stores the API keys for the Round Robin System

CREATE TABLE IF NOT EXISTS ai_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'exhausted'
    last_used DATETIME,
    reset_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
