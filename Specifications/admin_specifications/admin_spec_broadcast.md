# Admin Specification: Broadcast & Settings

## Overview
This specification details how Admins can push critical information to all users (or targeted groups) and manage overall platform limits.

## UI Components & Backend Requirements

### 1. Global Broadcasts (Push Notifications)
- **Context:** Useful for weather emergencies (e.g., Cyclone warnings) or promotional messages.
- **UI Components:**
  - **Message Editor:** Text inputs for "Notification Title" and "Body".
  - **Audience Selector:** Dropdown to select "All Users", "Specific District (e.g., Bogura)", or "Farmers growing specific crops (e.g., Rice)".
  - **Send Button:** Triggers the broadcast.
- **Backend Flow:**
  - `POST /api/admin/broadcast`
  - The Cloudflare Worker receives the payload. It queries D1 for the relevant users' FCM (Firebase Cloud Messaging) device tokens.
  - The Worker sends a batch request to the FCM HTTP V1 API to deliver the push notifications to Android devices instantly.

### 2. Platform Usage & Quota Monitoring
- **Context:** Crucial for staying within the Cloudflare Free Tier constraints.
- **UI Components:**
  - **D1 Reads/Writes Card:** Shows today's read/write operations against the free tier limit (5M daily limit).
  - **Worker Requests Card:** Shows total hits today (against the 100k daily limit).
  - **R2 Storage Card:** Shows GB used (against the 10GB free limit).
- **Backend Needed:**
  - Cloudflare's GraphQL Analytics API can be queried by the Worker to return these metrics to the Admin dashboard.

## Database Entities Used
- `users` (Need the `fcm_token` and `district` columns to target notifications)

## Future API Endpoints
- `GET /api/admin/system/metrics`
