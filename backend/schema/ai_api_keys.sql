DROP TABLE IF EXISTS ai_api_keys;

CREATE TABLE ai_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'exhausted', 'disabled'
    today_usage INTEGER DEFAULT 0,
    total_usage INTEGER DEFAULT 0,
    last_used DATETIME,
    reset_date DATETIME, -- The time when the key should reactive after exhaustion
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
