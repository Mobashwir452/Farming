# Add Land Functional Specification

## Overview
The Add Land page (`add_land.html`) is step 1 in the flow to register a new piece of land to the farmer's account.

## UI Components & Backend Requirements

### 1. Map Interaction (Optional/Visual)
- **Action:** Placeholder for a map where the user can pick the location.
- **Backend Needed:** Ability to store geospatial data (Latitude, Longitude) in the `Lands` table.

### 2. Form Inputs
- **"জমির নাম" (Land Name):** String input (e.g., "খালের ধারের জমি").
- **"জমির পরিমাণ" (Land Size):** Numeric input (e.g., 1.5).
- **Measurement Unit:** Dropdown (শতাংশ, একর, বিঘা).
- **Backend Needed:** 
  - `POST /api/lands` 
  - Payload: `{ name: string, area_size: float, area_unit: string, lat: float, lng: float }`

### 3. Navigation Buttons
- **"পরবর্তী ধাপ" (Next Step):**
  - **Action:** Submits the land. On success, transitions to the crop selection step (which gives them the choice between AI prediction and manual setup).
  - **Backend Needed:** API returns the newly created `land_id`, which the frontend passes to the next page (`add_crop.html?land_id=XYZ`).

## Database Entities Used
- `Lands` (id, user_id, name, area_size, area_unit, lat, lng, created_at, updated_at).

## Future API Endpoints
- `POST /api/lands`
