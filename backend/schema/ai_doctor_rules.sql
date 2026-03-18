-- backend/schema/ai_doctor_rules.sql
-- Stores specialized medicine mapping and logic rules for the Crop Doctor feature

CREATE TABLE IF NOT EXISTS ai_doctor_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_text TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default rule
INSERT OR IGNORE INTO ai_doctor_rules (id, rule_text, priority, is_active) 
VALUES (1, 'If disease is Rice Blast, always recommend "নাটিভো ৭৫" or "টেবুকোনাজল" for High Confidence matches. Emphasize organic solutions first.', 1, 1);
