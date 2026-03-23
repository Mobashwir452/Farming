-- backend/schema/transactions.sql
-- Table to store income and expenses for specific crops

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER NOT NULL,          -- References farmers(id)
    crop_id INTEGER NOT NULL,            -- References crops(id)
    farm_id INTEGER NOT NULL,            -- References farms(id)
    type TEXT NOT NULL,                  -- 'income' or 'expense'
    category TEXT NOT NULL,              -- e.g., 'Seed', 'Fertilizer', 'Pesticide', 'Labor', 'Harvest Sale', 'Other'
    amount_bdt REAL NOT NULL,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id),
    FOREIGN KEY (crop_id) REFERENCES crops(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);

-- Indexes for performance filtering
CREATE INDEX IF NOT EXISTS idx_transactions_farmer_id ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_crop_id ON transactions(crop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farm_id ON transactions(farm_id);
