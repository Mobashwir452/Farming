CREATE TABLE IF NOT EXISTS ai_chat_logs (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    crop_name TEXT,
    chat_history TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
