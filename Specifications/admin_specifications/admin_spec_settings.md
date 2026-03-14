# General Settings & Tracking Management Specifications

## Overview
এই মডিউলে অ্যাপ্লিকেশনের মৌলিক কনফিগারেশন এবং মার্কেটিং/অ্যানালিটিক্স ট্র্যাকিং স্ক্রিপ্টগুলো পরিচালনা করা হবে। এডমিন সহজেই ড্যাশবোর্ড থেকে Pixel, GA4, GTM ইন্টিগ্রেট করতে পারবেন।

---

## UI/UX Design

### 1. Page Details
*   **Title:** General Settings (`settings.html`)
*   **Header Button:** N/A (Direct save buttons in forms)
*   **Layout:** অন্যান্য পেজের মতই সাব-ট্যাব (Sub-tabs) সিস্টেমে ডিজাইন করা হবে।

### 2. Tabs Structure

#### Tab 1: Basic Site Configuration (বেসিক সাইট কনফিগারেশন)
*   **Logo Upload:** সাইটের মেইন লোগো এবং ফেভিকন আপলোড করার অপশন।
*   **Business Info:** কোম্পানির নাম, সাপোর্ট ইমেইল, হেল্পলাইন নাম্বার।
*   **Timezone & Currency:** ডিফল্ট টাইমজোন (Asia/Dhaka) এবং কারেন্সি (BDT ৳) সিলেক্ট করার অপশন।
*   **Maintenance Mode:** একটি টগল (Toggle) সুইচ যা সাইট মেইনটেনেন্সে নিতে সাহায্য করবে।

#### Tab 2: Tracking & Scripts (ট্র্যাকিং ও স্ক্রিপ্টস)
*   **Google Analytics 4 (GA4):**
    *   Input Field: "Measurement ID" (e.g., G-XXXXXXX).
    *   Status Toggle: On/Off.
*   **Facebook Pixel:**
    *   Input Field: "Pixel ID".
    *   Status Toggle: On/Off.
*   **Google Tag Manager (GTM):**
    *   Input Field: "Container ID" (e.g., GTM-XXXXXXX).
    *   Status Toggle: On/Off.

#### Tab 3: API & Integrations (এপিআই ইন্টিগ্রেশন) - (Optional for future)
*   **Payment Gateway API:** (aamarPay / SSLCommerz) Store ID, Signature Key.
*   **SMS Gateway API:** Bulk SMS provider API.

---

## Backend API Specification

### 1. `GET /api/v1/admin/settings`
**Purpose:** Fetch all current settings and tracking IDs.
**Response:**
```json
{
  "status": "success",
  "data": {
    "site": {
      "companyName": "AgriTech Bangladesh",
      "supportEmail": "support@agritech.com.bd",
      "maintenanceMode": false
    },
    "tracking": {
      "ga4": { "id": "G-12345678", "isActive": true },
      "fbPixel": { "id": "987654321", "isActive": false },
      "gtm": { "id": "GTM-ABCDEFG", "isActive": true }
    }
  }
}
```

### 2. `PUT /api/v1/admin/settings/tracking`
**Purpose:** Update tracking IDs from Tab 2.
**Request Body:**
```json
{
  "tracking": {
    "ga4": { "id": "G-87654321", "isActive": true },
    "fbPixel": { "id": "123456789", "isActive": true }
  }
}
```
**Response:** `200 OK`

---

## Technical Notes for Frontend Integration
1.  যখন API থেকে `tracking` ডেটা লোড হয় তখন মূল অ্যাপ্লিকেশন (পাবলিক পেজগুলো) যেন `index.html` এর `<head>` সেকশনে `isActive: true` থাকা স্ক্রিপ্টগুলোকে ডাইনামিকালি ইনজেক্ট (Inject) করে।
2. সাব-ট্যাব স্টাইলিংটি `profile.html` এ ব্যবহার করা গ্লোবাল `.sub-tabs` ক্লাস ফলো করবে।
