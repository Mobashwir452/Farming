-- This table serves as the 'Cache-Aside' layer for AI Generations.
-- It stores the one-time generated AI timeline so we don't spam Google Gemini.

DROP TABLE IF EXISTS ai_timeline_cache;

CREATE TABLE ai_timeline_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Lookup keys
    crop_name TEXT NOT NULL,     -- e.g., 'বোরো ধান'
    variety_name TEXT NOT NULL,  -- e.g., 'ব্রি ধান ২৮'
    
    -- Extracted Numerical Baselines (for 1 Shotangsho) to safely multiply by farmer's requested shotangsho
    base_cost_taka REAL,
    base_revenue_taka REAL,
    
    -- Stringified JSON payloads (These texts use generic 'per shotangsho' phrasing securely extracted via XML/Regex)
    timeline_json TEXT NOT NULL, -- The dynamically array'd steps: [{"title": "...", "desc": "..."}, ...]
    risks_json TEXT NOT NULL,    -- Array of risks: [{"type": "warning", "message": "..."}, ...]
    resources_json TEXT,         -- Array of precise quantities and itemized metrics for 1 Shotangsho
    crop_market_price_bdt REAL,  -- Expected final yield sale value (per native kg/maund)
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,         -- Set to 6 months after creation to auto-trigger a fresh AI generation
    
    UNIQUE(crop_name, variety_name)
);

CREATE INDEX idx_cache_lookup ON ai_timeline_cache(crop_name, variety_name);
