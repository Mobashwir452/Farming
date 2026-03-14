# Advanced Reports & Analytics Specifications

## Overview
এই পেজটি সম্পূর্ণ ডেটা ড্রিভেন। অ্যাডমিন এখান থেকে ওয়েবসাইটের ট্রাফিক, কৃষকদের সাবস্ক্রিপশন, এবং রেভিনিউ এর গ্রাফিক্যাল রিপোর্ট দেখতে পাবেন। 

---

## UI/UX Design

### 1. Page Details
*   **Title:** Advanced Analytics (`analytics.html`)
*   **Layout:** এই পেজে সাব-ট্যাবের বদলে উপরে একটি "Date Range Picker" (যেমন: Last 7 Days, Last 30 Days, This Year) থাকবে এবং নিচে বিভিন্ন সেকশনে গ্রাফ ও চার্ট প্রদর্শিত হবে।

### 2. Core Dashboard Sections

#### Section A: Financial & Growth Metrics (Top KPI Cards)
*   **MRR (Monthly Recurring Revenue):** এই মাসের সম্ভাব্য আয়।
*   **Total Revenue:** সিলেক্টেড Date Range এ মোট কত টাকা আয় হয়েছে।
*   **New Premium Farmers:** কতজন নতুন করে টাকা দিয়ে আপডেট করেছে বা করানো হয়েছে।
*   **ARPU (Average Revenue Per User):** মোট আয় / পেইড ইউজার।

#### Section B: Revenue Chart (রেভিনিউ চার্ট)
*   **Type:** Bar Chart বা Area Chart (Chart.js ব্যবহার করে)।
*   X-Axis: Date (Days/Months)।
*   Y-Axis: Revenue in BDT।

#### Section C: User Engagement & Retention (ইউজার অ্যাক্টিভিটি)
*   **DAU (Daily Active Users):** প্রতিদিন কতজন লগইন করছে (Line chart)।
*   **Top Used Features:** Crop Doctor, Weather, Hishab - এর মধ্যে কোনটি বেশি ব্যবহার হচ্ছে (Pie/Doughnut Chart)।
*   **Churn Rate:** কতজন ইউজার সাবস্ক্রিপশন রিনিউ করেনি তার হার।

### 3. Export Modal design
*   উপরে ডানপাশে একটি "Export Data" বাটন থাকবে।
*   ক্লিক করলে একটি Modal আসবে যেখান থেকে `CSV` বা `PDF` সিলেক্ট করে রিপোর্ট ডাউনলোড করা যাবে।

---

## Backend API Specification

### 1. `GET /api/v1/admin/analytics/summary`
**Purpose:** Fetch top KPI data based on a date range.
**Query Params:** `startDate=2026-03-01&endDate=2026-03-14`
**Response:**
```json
{
  "status": "success",
  "data": {
    "mrr": 45000,
    "totalRevenue": 21000,
    "newSubscribers": 140,
    "churnRate": "2.4%",
    "dauAverage": 4520
  }
}
```

### 2. `GET /api/v1/admin/analytics/charts`
**Purpose:** Fetch time-series data for rendering visual charts (Chart.js).
**Query Params:** `type=revenue&timeframe=daily`
**Response:**
```json
{
  "status": "success",
  "data": {
    "labels": ["Mar 1", "Mar 2", "Mar 3", "Mar 4"],
    "datasets": [
      {
        "label": "Revenue (BDT)",
        "data": [1200, 1500, 800, 2400]
      }
    ]
  }
}
```

### 3. `GET /api/v1/admin/analytics/export`
**Purpose:** Download raw data as CSV/Excel.
**Query Params:** `format=csv&module=subscriptions`
**Response:** File download stream (`text/csv` or `application/pdf`).

---

## Technical Notes for Frontend
1. গ্রাফ রেন্ডার করার জন্য `Chart.js` লাইব্রেরি ব্যবহার করা হবে যা হালকা এবং সুন্দর।
2. Date filter পরিবর্তন হলে AJAX এর মাধ্যমে ডাইনামিকালি সব চার্ট এবং KPI কার্ড আপডেট হবে (পেজ রিলোড ছাড়া)।
