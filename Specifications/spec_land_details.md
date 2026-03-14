# Land Details Functional Specification

## Overview
The Land Details page (`land_details.html`) is the deepest dive into a specific piece of land. It shows the active crop, financial overview, smart weather insights, and the entire timeline of tasks (past, present, and future) associated with the current crop cycle.

## UI Components & Backend Requirements

### 1. Land & Financial Overview (Header Card)
- **Action:** Displays Land Name, Size, Total Profit/Loss, and Plant Survivability (e.g., Initial: 5000, Lost: 300, Current: 4700).
- **Backend Needed:**
  - Takes `land_id` from URL (`GET /api/lands/{id}`).
  - Aggregates income vs. expenses from the `Transactions` table for this specific crop cycle.
  - Calculates current crop count by subtracting logged losses from the initial seed count.

### 2. Smart Weather Widget
- **Action:** Shows current weather. Clicking opens the 5-7 day forecast modal.
- **Backend Needed:** Fetch precise weather data based on the land's GPS coordinates (if stored during mapping).

### 3. Active Crop Card
- **Action:** Displays details about the crop currently growing. Links to harvest/finish lifecycle.
- **Backend Needed:** Fetch from `Crops` table where `land_id = {id}` and `lifecycle_status = 'active'`.

### 4. Task Timeline (`.timeline-container`)
- **Action:** Displays tasks grouped by Past, Today, and Future.
- **Backend Needed:** 
  - `GET /api/crops/{crop_id}/timeline`
  - Returns a vertically ordered list of tasks from the `Tasks` table.
- **User Actions on Tasks:**
  - **Mark as Done:** Updates task status to `completed` (`POST /api/tasks/{task_id}/complete`).
  - **Reschedule:** Opens `#calendarModal` to pick a new date. Updates task date (`PUT /api/tasks/{task_id}/reschedule`).
  - **Cancel:** Updates task status to `cancelled` (`POST /api/tasks/{task_id}/cancel`).

### 5. Quick Analytics / Entry Actions (Buttons)
- **"খরচ/আয় এন্ট্রি" (Transactions):** Opens modal to log money.
  - **Backend:** `POST /api/transactions` (land_id, type, amount, category, date).
- **"ক্ষয়ক্ষতি ও হিসাব" (Loss Logging):** Opens modal to log dead plants/ruined crops.
  - **Backend:** `POST /api/crops/{crop_id}/loss_logs` (date, reason, quantity_lost).
- **"নতুন কাজ যোগ" (Custom Step):** Opens modal to add a manual step to the timeline.
  - **Backend:** `POST /api/tasks` (crop_id, title, scheduled_date, type='custom').

### 6. Modals
- **Calendar Modal (`#calendarModal`):** Triggered by clicking inputs to pick dates. Purely frontend UI, but sets the date payload for backend requests.

## Database Entities Used
- `Lands`
- `Crops`
- `Tasks`
- `Transactions`
- `CropLossLogs` (new table needed to track reasons for plant death/loss)

## Future API Endpoints (Suggestions)
- `GET /api/lands/{id}/details`
- `GET /api/crops/{crop_id}/timeline`
- `POST /api/transactions`
- `POST /api/tasks`
- `PUT /api/tasks/{id}`
