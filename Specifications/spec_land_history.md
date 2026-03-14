# Land History & Accounting Functional Specification

## Overview
The Land History page (`land_history.html`) provides a historical, macro-level view of a specific land. It shows the all-time profit/loss across all completed crop cycles, and allows the farmer to dive into the specific accounting breakdown of past crops.

## UI Components & Backend Requirements

### 1. All-Time Summary Card
- **Data Displayed:** Total Profit/Loss (সব মিলিয়ে লাভ/ক্ষতি), Total Yield (মোট ফলন).
- **Backend Needed:** 
  - `GET /api/lands/{id}/history`
  - Calculates the absolute sum of all income minus all expenses for *all* crops ever grown on this `land_id`. Calculates the absolute sum of all yields.

### 2. Historical Crop Cycles (Accordions)
- **Data Displayed:** A list of past crops (e.g., "বোরো ধান - ২০২৫", "পাট - ২০২৪").
- **Yield Weight Tracking (Inventory Feature):**
  - **Action:** Some harvested crops (like Tomatoes or Potatoes) degrade or dry out over time. The UI shows "বর্তমান সংরক্ষিত ওজন" (Current Preserved Weight) and an "ওজন আপডেট" (Update Weight) button which triggers the `#weightModal`.
  - **Backend Needed:**
    - A `Harvest_Inventory` table or columns in the `Crops` table to track the `initial_harvest_weight` and `current_weight`.
    - `POST /api/crops/{crop_id}/update-weight` accepting a payload like `{ new_weight, reason: 'drying' | 'rotten' | 'sold' }`. This keeps a running ledger of post-harvest inventory.
- **Backend Needed:** The same endpoint (`GET /api/lands/{id}/history`) should return an array of past crops where `lifecycle_status = 'completed'`.
- **Each item in the array must contain:**
  - Crop details (Type, Year, Duration).
  - Yield Quantity (`total_yield`) and `current_weight`.
  - Total Income from that crop.
  - Total Expense for that crop.
  - A detailed array of categorized expenses (`expense_breakdown`: Seed, Fertilizer, Labor, Pesticide, etc.) to populate the accordion dropdown.

### 3. Expense Breakdown (Inside Accordion)
- **Action:** Clicking a historical crop expands it to show exactly where the money went.
- **Backend Needed:** Aggregation of `Transactions` table where `crop_id = X` and `type = 'expense'`, grouped by `category`.

## Database Entities Used
- `Lands`
- `Crops` (completed cycles only)
- `Transactions` (linked to crop_id)

## Future API Endpoints
- `GET /api/lands/{id}/history`
