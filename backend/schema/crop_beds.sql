-- backend/schema/crop_beds.sql
-- Table to store specific beds inside a crop project

CREATE TABLE IF NOT EXISTS crop_beds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_id INTEGER NOT NULL,            -- References crops(id)
    bed_name TEXT NOT NULL,              -- e.g., "Bed-1"
    width REAL DEFAULT 0,                -- width in ft or units
    length REAL DEFAULT 0,               -- length in ft or units
    plants_nodes_json TEXT,              -- Array of plant nodes [{id: 'B1-T1', row: 1, col: 1, health: 100, status: 'Healthy'}]
    custom_settings_json TEXT,           -- stores custom sizing or position overrides for Map Editor
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crop_id) REFERENCES crops(id)
);

CREATE INDEX IF NOT EXISTS idx_crop_beds_crop_id ON crop_beds(crop_id);
