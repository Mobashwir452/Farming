-- Update Crops Table
ALTER TABLE crops ADD COLUMN resources_state_json TEXT;
ALTER TABLE crops ADD COLUMN tasks_state_json TEXT;
ALTER TABLE crops ADD COLUMN expected_revenue_bdt REAL;
ALTER TABLE crops ADD COLUMN expected_cost_bdt REAL;

-- Update AI Timeline Cache Table
ALTER TABLE ai_timeline_cache ADD COLUMN resources_json TEXT;
ALTER TABLE ai_timeline_cache ADD COLUMN crop_market_price_bdt REAL;
