-- backend/schema/crops.sql
-- Table to store crops associated with specific user farms

CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,            -- References farms(id)
    crop_name TEXT NOT NULL,             -- e.g., "বোরো ধান (ব্রি-২৮)", "শীতকালীন টমেটো"
    planted_date DATETIME,               -- When the crop was planted
    status TEXT DEFAULT 'Healthy',       -- System/AI governed status ('Healthy', 'Warning', 'Harvested', 'Disease Risk')
    current_plant_count INTEGER,         -- Approximate tracking of current plants
    initial_plant_count INTEGER DEFAULT 0, -- Track initial planted numbers
    expected_harvest_date DATETIME,      -- Projected harvest time
    resources_state_json TEXT,           -- User tracking check-offs and exact resource lists from AI
    tasks_state_json TEXT,               -- Real-time tracking of AI calendar step completions
    loss_events_json TEXT DEFAULT '[]',  -- Track loss events array
    expected_revenue_bdt REAL,           -- Computed expectation of final sale
    expected_cost_bdt REAL,              -- Computed expectation of total cost
    yield_amount_kg REAL DEFAULT 0,      -- Amount of harvest in kg
    harvest_notes TEXT,                  -- Details about what part of land was harvested
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);

-- Index for faster lookups by farm_id
CREATE INDEX IF NOT EXISTS idx_crops_farm_id ON crops(farm_id);
