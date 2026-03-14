# Admin Specification: Add Land (`add_land.html`)

## Overview
The `add_land.html` page is where users map their land using their phone's GPS or by entering data manually. The process happens entirely on the frontend/user device, and the final calculated data is sent to the backend.

## UI Components & Admin Backend Requirements

### 1. Land Registration Data Processing (Backend)
- **Context:** The frontend handles the math (e.g., calculating polygon area via `turf.js` or manual entry). The backend simply needs to accept, validate, and store this data.
- **Data Points Collected:** Land Name (e.g., "খালের ধার"), Land Size (e.g., 0.45), Unit (e.g., একর), and optionally GPS coordinates (GeoJSON Polygon or central Lat/Lng).
- **Admin Side Required Tasks:**
  - **No Manual Admin Action Needed:** Unlike crops where admins might need to add new varieties, the act of a user adding a piece of land requires zero manual approval from an Admin in a SaaS model. It happens automatically.
  - **Validation Security:** The Worker API must validate that a user isn't submitting impossible data (e.g., 100,000 acres, or negative numbers).

### 2. Admin View: Land Directory (`admin/lands.html` or within `users.html`)
- **Context:** Admins need visibility into what land is registered on the platform for support and analytical reasons.
- **UI Components:**
  - **Global Land List:** A searchable table of all registered lands. Columns: Owner (Farmer Name), Land Name, Size, Date Added.
  - **Map View (Analytical):** A plotted map showing heatmaps of where AgriTech users are concentrated based on the submitted GPS coordinates.
  - **Detail View:** Clicking a land shows its history (which crops have been grown there, active tasks). This can be integrated into the User's Profile view in the admin panel.

## Database Entities Used
- `lands` (id, user_id, name, area_size, area_unit, geojson_polygon, created_at)

## Future API Endpoints (Admin Side)
- `GET /api/admin/lands` (List all lands with pagination)
- `GET /api/admin/lands/heatmap` (Get aggregated GPS points for the admin dashboard)
