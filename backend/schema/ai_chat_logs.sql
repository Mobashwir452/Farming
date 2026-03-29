CREATE TABLE IF NOT EXISTS ai_chat_logs (
    id TEXT PRIMARY KEY,
    crop_id TEXT,
    user_id TEXT,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
