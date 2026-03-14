# UX Scope Phase: Content Requirements

Content Requirements define *what information the system must provide* (text, images, audio, data) to support the Functional Requirements and User Needs.

## 1. Multi-Media & Localization Content
*   **Primary Language:** All UI text, tooltips, and alerts MUST be available in highly contextual, colloquial Bengali.
*   **Iconography Library:** A custom set of culturally recognizable icons must be designed (e.g., a local tractor, local currency symbol ৳, recognizable sack of urea).
*   **Voice Over Assets:** Pre-recorded Bengali audio clips or Text-to-Speech (TTS) strings for all major headings and instructions (to support low-literacy users).
*   **Disease Image Database:** High-quality reference images of healthy crops vs. standard crop diseases (e.g., Rice Blast, Potato Blight) to assist manual verification by the farmer.

## 2. Agronomic Data (The "Brain" Content)
*   **Crop Profiles:** Detailed metadata for at least 30 common South Asian crops (e.g., Boro Rice, Aman Rice, Wheat, Potato, Tomato).
    *   *Data per crop:* Seed rate per acre, expected yield per acre, standard germination time, water requirement level.
*   **Task Timelines (Algorithms):** For each crop, a structured timeline of events:
    *   *Example Content:* "Day 15: Apply 1st top dressing of Urea (X kg/acre)."
*   **Soil & Salinity Database:** Integrating geospatial data from SRDI (Soil Resource Development Institute) to match upazilas with soil characteristics.
*   **Pesticide & Fertilizer Database:** A localized registry of common input materials mapping generic chemical names to popular local brand names.

## 3. Market & Retailer Data (Ecosystem Content)
*   **Retailer Catalogues:** Localized product listings for seeds, fertilizers, and equipment from registered agro-dealers.
*   **Live Market Prices:** Daily or weekly updated benchmark prices for crops in major local wholesale markets (e.g., Karwan Bazar, local Upazila bazars).
*   **Expert Profiles:** Bios, credentials, and availability schedules of verified agricultural experts for premium video consultations.

## 4. User-Generated Content (UGC) Requirements
*   **Financial Records:** The app must store and organize user-generated numerical data (Money spent, categorical tags like 'Labor' or 'Seeds').
*   **Geospatial Data:** The app must store Latitude/Longitude coordinates representing farm boundaries.
*   **Photographic Evidence:** The app must store user-uploaded images of diseased crops temporarily or permanently for AI training / expert review.

## 4. System Content & Notifications
*   **Weather Data Feeds:** Integration with a 3rd party API (e.g., OpenWeatherMap) to fetch and display 7-day forecasts (Temperature, Rain probability, Humidity) for the farmer's specific Upazila.
*   **Empty States (Zero Data States):** Conversational, helpful text content for when a user has no data yet.
    *   *Example Content:* "You haven't mapped any fields yet. Tap the '+' button below to start walking your land."
*   **Error Messages:** Non-technical, reassuring error content in Bengali.
    *   *Example Content:* "Your internet is disconnected right now. Don't worry, your data is saved on your phone and will upload automatically later."
