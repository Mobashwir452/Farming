-- backend/schema/ai_logs.sql
-- Stores interaction history for the entire AI Prompt Engine

CREATE TABLE IF NOT EXISTS ai_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_phone TEXT NOT NULL,
    feature TEXT NOT NULL, -- e.g., 'crop_doctor', 'smart_prediction'
    api_key_used TEXT, -- Stores which Round Robin key was used
    input_prompt TEXT,
    ai_response TEXT,
    tokens_used INTEGER,
    scan_confidence TEXT, -- e.g., 'High', 'Low', '92%'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
