-- backend/schema/plant_logs.sql
-- Table to keep notion-style timeline logs for a specific tree mapped to a bed

CREATE TABLE IF NOT EXISTS plant_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bed_id INTEGER NOT NULL,             -- References crop_beds(id)
    plant_identifier TEXT NOT NULL,      -- e.g., "B1-T7" inside the plants_nodes_json array
    note TEXT,                           -- User notes extending the timeline
    image_url TEXT,                      -- Path or URL to the visual attachment
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bed_id) REFERENCES crop_beds(id)
);

CREATE INDEX IF NOT EXISTS idx_plant_logs_bed_id ON plant_logs(bed_id);
CREATE INDEX IF NOT EXISTS idx_plant_logs_identifier ON plant_logs(plant_identifier);
