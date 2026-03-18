-- backend/schema/ai_config.sql
-- Stores the global AI Prompt Engine settings and Emergency Fallback options

CREATE TABLE IF NOT EXISTS ai_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_prompt TEXT NOT NULL,
    fallback_message TEXT NOT NULL,
    emergency_stop BOOLEAN DEFAULT 0, -- 0 for Active, 1 for Stopped
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default row so the admin UI has something to load initially
INSERT OR IGNORE INTO ai_config (id, system_prompt, fallback_message, emergency_stop) 
VALUES (
    1, 
    'You are a highly experienced agricultural expert based in Bangladesh. Your task is to answer farmers questions clearly and simply using the provided context. STRICT RULES: 1. Always reply in Bengali (বাংলা). 2. Do not hallucinate or invent crop medicines. 3. If unsure, tell them to call the helpline 16162.', 
    'দুঃখিত, আমি আপনার প্রশ্নটি বুঝতে পারিনি অথবা আমার কাছে এর সঠিক তথ্য নেই। অনুগ্রহ করে 16162 হেল্পলাইনে কল করুন।', 
    0
);
