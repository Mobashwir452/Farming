DROP TABLE IF EXISTS ai_logs;

CREATE TABLE ai_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_type TEXT NOT NULL,
    crop_name TEXT,
    variety_name TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
