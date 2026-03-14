# Tasks (Timeline) Functional Specification

## Overview
The Tasks page (`tasks.html`) provides a comprehensive view of all pending and completed agricultural tasks across all of the farmer's active crops and lands. It uses a tabbed view (Upcoming vs. Completed).

## UI Components & Backend Requirements

### 1. Tab Navigation (Upcoming / Completed)
- **Action:** Toggling tabs switches the view.
- **Backend Needed:** 
  - `GET /api/tasks?status=pending`
  - `GET /api/tasks?status=completed`
  - The API should accept pagination and sorting (e.g., sort by `scheduled_date` ASC for pending, DESC for completed).

### 2. Task Cards
- **Data Displayed:**
  - Date and Time
  - Task Title and Icon (e.g., 💧 সেচ দেওয়া)
  - Linked Crop and Land (e.g., "ধান - খালের ধারের জমি")
- **Action - Mark Complete:**
  - User clicks the primary button.
  - **Backend Needed:** `POST /api/tasks/{task_id}/complete`. Upon success, the UI updates visually.
- **Action - Reschedule:**
  - User taps the 3-dot menu and chooses "নতুন তারিখ". Opens `#calendarModal`.
  - **Backend Needed:** `PUT /api/tasks/{task_id}/reschedule` with the new UTC date.

### 3. Task Generation Logic (Backend Side)
- The frontend blindly displays what the backend sends.
- The backend is responsible for creating these tasks. When a crop is registered, the backend references a "Crop Template" defining intervals (e.g., "Apply Urea 15 days after planting").
- A daily cron job updates overdue tasks and triggers push notifications.

## Database Entities Used
- `Tasks`
- `Crops` (for joining land/crop names)
- `Lands`

## Future API Endpoints
- `GET /api/tasks` (with query params)
- `POST /api/tasks/{id}/complete`
- `PUT /api/tasks/{id}/reschedule`
