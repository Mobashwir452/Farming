-- This table serves as our 'Digital Agricultural Knowledge Base'
-- It holds verified baseline data from BRRI, BARI, and other government sources.

DROP TABLE IF EXISTS crops_master_data;

CREATE TABLE crops_master_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_category TEXT NOT NULL, -- e.g., 'ধান', 'সবজি', 'ফল'
    crop_name TEXT NOT NULL,     -- e.g., 'বোরো ধান'
    variety_name TEXT NOT NULL,  -- e.g., 'ব্রি ধান ২৮'
    
    -- Region Suitability
    suitable_regions TEXT,       -- e.g., 'দেশের সব অঞ্চল (হাওর ও লবণাঞ্চল ছাড়া)'
    soil_type TEXT,              -- e.g., 'উঁচু ও মাঝারি জমি'
    
    -- Baseline Parameters (Standardized to 1 Shotangsho for backend math simplicity)
    base_yield_per_shotangsho_kg REAL,      
    avg_duration_days INTEGER,   
    -- Specific Traits
    disease_resistance TEXT,     
    disease_resistance_score INTEGER, -- (1-10 rating computed by AI)
    special_features TEXT,       
    
    -- Planting & Harvesting
    planting_months TEXT,        -- e.g., 'November, December'
    
    -- Metadata
    data_source TEXT,            -- e.g., 'BRRI Knowledge Bank'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(crop_name, variety_name)
);

CREATE INDEX idx_crop_search ON crops_master_data(crop_name, variety_name);
