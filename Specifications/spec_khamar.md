# Khamar (Farm Dashboard) Functional Specification

## Overview
The Khamar page (`khamar.html`) lists all the lands/farms owned or managed by the user. It provides an at-a-glance view of what crop is currently growing on each piece of land, its status, and quick actions.

## UI Components & Backend Requirements

### 1. Farm List Overview
- **Empty State (`.empty-state-container`):**
  - **Action:** Shown if the user has 0 lands. Contains a button to add land.
  - **Backend Needed:** API to fetch the user's list of lands (`GET /api/lands`). If the array is empty, render the empty state.
- **Farm Cards (`.farm-card`):**
  - **Action:** Clicking the card navigates to `land_details.html?land_id=XYZ`.
  - **Data Displayed:**
    - Land Name (e.g., "খালের ধারের জমি")
    - Land Size (e.g., "১.২ একর")
    - Current Crop Name & Status (e.g., "বোরো ধান", "ফুল আসার সময়")
    - Planted Date / Age (e.g., "২৫ দিন")
    - Total Expense & Projected Yield
  - **Backend Needed:** 
    - Database tables: `Lands` (id, user_id, name, area_size, area_unit, created_at).
    - `Crops` (id, land_id, crop_type, variety, planted_date, status, projected_yield).
    - `Transactions` (to calculate total expense per land).
    - API must return a joined response containing land details along with the active crop and aggregated financial summary.

### 2. Land-Specific Quick Actions
- **Action Footer (`.fc-footer`):**
  - **Action:** Displays the most urgent task for that specific land (e.g., "স্প্রে করুন"). Clicking "টাইমলাইন" goes to the timeline view.
  - **Backend Needed:** The `GET /api/lands` API should pre-calculate or fetch the next immediate pending task for the `active` crop on each land.
- **3-Dot Menu (Kebab Menu / `.btn-icon`):**
  - **Action - "টাইমলাইন" (Timeline):** Redirects the user directly to the detailed timeline view (`land_details.html`).
    - **Backend:** No dynamic request needed on click, just pass the `land_id`.
  - **Action - "আয়-ব্যয় যোগ করুন" (Add Income/Expense):** Opens a modal or redirects to a form to log financial transactions associated directly with this land.
    - **Backend:** Setup `POST /api/transactions` with the specific `land_id` pre-linked.
  - **Action - "ফসল কর্তন করুন" (Record Harvest):** Triggers the harvest flow, formally ending the active crop cycle.
    - **Backend:** `POST /api/crops/{crop_id}/harvest` with payload `{ yield_quantity, date }`. This sets the crop's `lifecycle_status` to `'completed'`, opening up the land for a new crop.
  - **Action - "জমি ডিলিট করুন" (Delete Land):** Deletes the land profile and cascades to delete associated crops, tasks, and historical logs.
    - **Backend:** `DELETE /api/lands/{id}`. Requires a double-confirmation prompt on the UI to prevent accidental data loss.

### 3. Add Land Button (FAB)
- **Action:** Floating Action Button navigates to `add_land.html`.
- **Backend Needed:** None directly on this page, but sets up the flow for `POST /api/lands`.

## Database Entities Used
- `Lands`
- `Crops` (filtering by `status = 'active'`)
- `Tasks` (filtering by `crop_id` and `date <= today`)
- `Transactions` (aggregated by `land_id`)

## Future API Endpoints (Suggestions)
- `GET /api/lands` (with nested active crop and next task)
