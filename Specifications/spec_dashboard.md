# Dashboard Functional Specification

## Overview
The Dashboard (`dashboard.html`) is the main landing hub for the farmer after login. It provides a quick overview of today's tasks, pending actions, recent notifications, and weather.

## UI Components & Backend Requirements

### 1. Global Navigation (Header & Bottom Nav)
- **Weather Widget:**
  - **Action:** Displays current weather. Clicking opens the `#weatherModal` (5-day forecast).
  - **Backend Needed:** API endpoint to fetch real-time weather data based on the user's location (stored in DB or fetched via GPS).
- **Notification Drawer (`#notifDrawer`):**
  - **Action:** Clicking the bell icon opens the drawer.
  - **Backend Needed:** API to fetch user's notifications (alerts, tasks, messages). Needs a database table `notifications` (id, user_id, title, message, type, is_read, timestamp). API to mark notifications as read.
- **Bottom Navigation:**
  - **Action:** Links to Dashboard, Khamar, Scan, Tasks, Accounting.

### 2. Daily Greeting & Task Card
- **Daily Weather/Tips Banner (`.tips-banner`):**
  - **Action:** Shows today's actionable tip (e.g., "It will rain, don't spray").
  - **Backend Needed:** Integration with Agri-weather API to generate dynamic tips based on weather conditions.
- **Main Task Card (`.task-card`):**
  - **Action:** Shows the user's primary/most urgent task for today. User can mark it "Done" or "Later".
  - **Backend Needed:** API to fetch the most urgent task from the `tasks` table for the current day. API endpoint to update the task status (`POST /api/tasks/{id}/complete`). 

### 3. Quick Action Grid (`.quick-grid`)
- **Action:** Four primary app modules (আমার খামার, আয়-ব্যয়, সরকারি সহায়তা, সাপোর্ট সেন্টার).
- **Backend Needed:** 
  - To display the "২ টি খামার" subtext, the backend must return a summary API (`GET /api/dashboard/summary`) that includes total active farms.

### 4. Recent Activity (Transactions/Logs)
- **Recent Activity List:**
  - **Action:** Displays latest financial transactions or field logs.
  - **Backend Needed:** API to fetch recent entries from `transactions` (id, user_id, type [income/expense], amount, date, description) and `activity_logs`.

## Database Entities Used
- `Users`
- `Notifications`
- `Tasks`
- `Transactions`
- `Crops` (for aggregation)

## Future API Endpoints (Suggestions)
- `GET /api/dashboard/summary`
- `GET /api/weather/forecast`
- `GET /api/notifications`
- `POST /api/tasks/{id}/status`
