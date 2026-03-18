-- backend/schema/ai_prediction_baselines.sql
-- Stores baseline metrics for the Smart Crop Prediction features

CREATE TABLE IF NOT EXISTS ai_prediction_baselines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_name TEXT NOT NULL UNIQUE,
    avg_yield TEXT NOT NULL,
    avg_cost TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert some default values
INSERT OR IGNORE INTO ai_prediction_baselines (id, crop_name, avg_yield, avg_cost) VALUES 
(1, 'বোরো ধান (ব্রি-২৮)', '৫০-৬০ মণ', '৳ ১৮,০০০'),
(2, 'আলো (ডায়মন্ড)', '৭০-৮০ মণ', '৳ ২২,০০০'),
(3, 'ভুট্টা', '৮০-৯০ মণ', '৳ ১৫,০০০');
