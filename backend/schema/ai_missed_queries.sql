CREATE TABLE IF NOT EXISTS ai_missed_queries (
    id TEXT PRIMARY KEY,
    user_query TEXT NOT NULL,
    crop_name TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
