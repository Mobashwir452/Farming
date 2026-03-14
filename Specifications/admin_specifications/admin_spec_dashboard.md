# Admin Specification: Dashboard / Overview

## Overview
The Admin Dashboard (`index.html` or `dashboard.html` in the admin panel) provides a bird's-eye view of the AgriTech SaaS platform's health and usage. It aggregates data from various frontend modules.

## UI Components & Backend Requirements

### 1. Key Metrics Cards
- **Total Farmers:** Total number of registered users from the `users` table.
- **Total Land Mapped:** Total acres/decimals calculated from all entries in the `lands` table.
- **Pending Helpdesk Tickets:** Count of unanswered queries from the `helpdesk` table.
- **AI Requests Today:** Count of daily hits to the Worker AI endpoints.
- **Backend Needed:** 
  - `GET /api/admin/stats/overview`
  - Returns a JSON object with counts and percentage changes compared to the previous week.

### 2. Activity Charts
- **User Registration Trend:** A line chart showing active daily registrations over the last 30 days.
- **Top Crop Distribution:** A pie chart showing the percentage of total land dedicated to specific crops (e.g., 40% Boro Rice, 20% Potato) based on data from `add_crop.html`.

### 3. Recent Alerts / Quick Actions
- A list of the latest flagged community posts or high-priority helpdesk tickets.
- Buttons for quick navigation: "Review Tickets", "Send Broadcast", "Check AI Logs".

## Database Entities Used
Aggregates data from almost all D1 tables: `users`, `lands`, `crops`, `helpdesk_tickets`, `community_posts`.

## Future API Endpoints
- `GET /api/admin/charts/user-growth`
- `GET /api/admin/charts/crop-distribution`
