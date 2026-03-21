-- backend/schema/farms.sql
-- Table to store user-created farms/lands

CREATE TABLE IF NOT EXISTS farms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER NOT NULL,          -- References farmers(id)
    name TEXT NOT NULL,                  -- e.g., "বাড়ির পেছনের জমি"
    area_shotangsho REAL NOT NULL,            -- e.g., 45, 120
    location TEXT,                       -- Reverse geocoded location summary
    map_coordinates TEXT,                -- Reserved for future GPS/Map polygon feature
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);

-- Index for faster lookups by farmer_id
CREATE INDEX IF NOT EXISTS idx_farms_farmer_id ON farms(farmer_id);
