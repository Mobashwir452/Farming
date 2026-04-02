CREATE TABLE IF NOT EXISTS crop_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    farm_id INTEGER,
    crop_id INTEGER,
    image_url TEXT,
    disease_name_bn TEXT,
    disease_name_en TEXT,
    confidence_score REAL,
    status TEXT, -- 'healthy', 'disease_detected', 'not_a_crop', 'failed'
    scan_result_json TEXT, -- XML extracted info saved as JSON string (symptoms, organic, chemical, prevention)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
