# UX Scope Phase: Functional Requirements

Functional Requirements define *what the system must do* (the features and capabilities) to fulfill the Business Objectives and User Needs defined in the Strategy Phase.

## 1. Core Farmer Modules
### A. Authentication & Onboarding
*   The system must allow login/registration using solely a Mobile Number and OTP.
*   The system must ask for preferred language (Bengali/English) immediately upon first login.
*   The system must collect mandatory profile data: Name, District/Upazila.

### B. Field & Land Management (GPS Integration)
*   The system must allow users to map a land boundary by dropping pins on a satellite map.
*   The system must allow users to map a land boundary by physically walking the perimeter with GPS enabled.
*   The system must automatically calculate the area (in Acres and Decimals) of the mapped polygon.
*   The system must allow users to save and name multiple distinct land plots.

### C. Smart Crop Selection & Task Calendar
*   **The system must analyze the user's location and soil data (e.g., coastal salinity) to recommend optimal crop varieties (e.g., BARI Barley-4).**
*   The system must generate a crop-specific daily task baseline when a user inputs a crop type and planting date.
*   The system must allow users to mark daily tasks as "Complete", "Skipped", or "Delayed".
*   The system must trigger push notifications for time-sensitive tasks (e.g., "Fertilizer required tomorrow").

### D. Financial Dashboard (Digital Ledger)
*   The system must provide an interface to log Income (Sale of harvest) and Expenses (Seeds, Labor, Fertilizer, Equipment).
*   The system must automatically calculate and display total Net Profit/Loss.
*   The system must calculate and visually display the Benefit-Cost Ratio (BCR).

### E. Disease & Pest Diagnosis (Camera Integration)
*   The system must allow users to capture a photo using the device camera or upload an image from the gallery.
*   The system must process the image (offline or via API) to identify common crop diseases.
*   The system must output a percentage-based confidence score for the diagnosis.

### F. Premium / Subscription Features
*   **The system must allow users to request live video consultations with agricultural experts.**
*   **The system must integrate satellite-based NDVI (Normalized Difference Vegetation Index) mapping to detect invisible water or nitrogen stress in mapped land plots.**

## 2. Infrastructure & System Capabilities
*   **Offline-First Sync:** The system must save all ledger entries, completed tasks, and GPS maps locally on the device (LocalForage/IndexedDB).
*   **Background Sync:** The system must automatically push local data to the Cloudflare D1 database the moment an internet connection is established via Service Workers.
*   **Role-Based Access Control (RBAC):** The system must differentiate between a standard "Farmer" account and an "Enterprise/Admin" account, routing them to different dashboard views.

## 3. Enterprise / Admin Modules
*   The system must allow enterprise users (NGOs/Banks) to view an aggregated map of connected farmers.
*   The system must generate downloadable reports (CSV/PDF) on farmer activity and crop health.
*   The system must allow Admins to push custom, localized broadcast alerts (e.g., severe weather warnings) to specific districts.
