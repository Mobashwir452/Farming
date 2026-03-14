# CMS & Ad Management Specifications

## Overview
এই মডিউলে অ্যাপ্লিকেশনের পাবলিক পেজগুলোর কন্টেন্ট (যেমন- হিরো ব্যানার, FAQ) এবং ওয়েবসাইটের বিভিন্ন স্থানে বিজ্ঞাপন (AdSense বা Manual) দেখানোর ব্যবস্থা করা হবে। সম্পূর্ণ প্রক্রিয়াটি কোনো কোডিং ছাড়াই অ্যাডমিন প্যানেল থেকে কন্ট্রোল করা যাবে।

---

## UI/UX Design

### 1. Page Details
*   **Title:** কন্টেন্ট ও অ্যাড ম্যানেজমেন্ট (`cms.html`)
*   **Layout:** অন্যান্য পেজের মতই সাব-ট্যাব (Sub-tabs) সিস্টেমে ডিজাইন করা হবে।
*   **Modals:** "Add New Ad" বাটনে ক্লিক করলে একটি মডাল ওপেন হবে (স্টাইলিং `subscriptions.html` এর `newPackageModal` এর অনুরূপ)।

### 2. Tabs Structure

#### Tab 1: Home Page Content (হোমপেজ কন্টেন্ট)
*   **Hero Slider/Banners:** বর্তমান ব্যানারগুলোর ছোট লিস্ট। নতুন ইমেজ আপলোড এবং লিঙ্ক (URL) বসানোর অপশন।
*   **FAQ Manager:** অ্যাকর্ডিয়ন স্টাইলে প্রশ্নোত্তর যোগ বা এডিট করার ফর্ম।

#### Tab 2: Ad Placements (অ্যাড પ્લેসমেন্ট)
*   এই ট্যাবে একটি কার্ড ডিজাইন থাকবে যেখানে ওয়েবসাইটের "Available Slots" গুলো লিস্ট করা থাকবে। 
    *   *Slot 1: Home Page Hero Bottom*
    *   *Slot 2: Community Sidebar Right*
    *   *Slot 3: Crop Doctor Result Bottom*
*   **"Configure Ad" Button:** প্রতি স্লটের পাশে বোতাম থাকবে যা ক্লিক করলে একটি **Modal** ওপেন হবে।

### 3. "Configure Ad" Modal Design
এই মডালটিতে অ্যাডমিন সিদ্ধান্ত নেবেন তিনি ওই স্লটে কী ধরনের বিজ্ঞাপন চালাবেন।
*   **Ad Type Selection (Radio Buttons):**
    *   `None` (অ্যাড বন্ধ)
    *   `Google AdSense`
    *   `Manual Custom Banner`
*   **If AdSense is selected:**
    *   Textarea আসবে যেখানে অ্যাডমিন `<script>` বা `<ins>` ট্যাগ পেস্ট করবেন।
*   **If Manual is selected:**
    *   Image upload field (Banner Upload)।
    *   Target URL field (ইউজার ক্লিক করলে কোথায় যাবে)।
    *   Start Date & End Date (কতদিন এই ম্যানুয়াল অ্যাড চলবে)।

---

## Backend API Specification

### 1. `GET /api/v1/admin/cms/ads`
**Purpose:** Fetch all ad configurations for all slots.
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "slotId": "home_hero_bottom",
      "slotName": "Home Page Hero Bottom",
      "adType": "adsense",
      "adSenseCode": "<script async src=\"...\"></script><ins class=\"adsbygoogle\" ...></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>",
      "manualAd": null
    },
    {
      "slotId": "community_sidebar",
      "slotName": "Community Sidebar Right",
      "adType": "manual",
      "adSenseCode": null,
      "manualAd": {
        "imageUrl": "/assets/ads/sponsor_banner_1.jpg",
        "targetUrl": "https://sponsor-website.com",
        "validUntil": "2026-12-31T23:59:59Z"
      }
    }
  ]
}
```

### 2. `PUT /api/v1/admin/cms/ads/:slotId`
**Purpose:** Update an ad slot configuration from the Modal.
**Request Body (Manual Ad Example):**
```json
{
  "adType": "manual",
  "manualAd": {
    "imageFileBase64": "data:image/jpeg;base64,...",
    "targetUrl": "https://aci-fertilizer.com",
    "validUntil": "2026-06-30"
  }
}
```
**Response:** `200 OK`

---

## Technical Notes for Frontend Public Pages
1. ওয়েবসাইট লোড হওয়ার সময় ফ্রন্টএন্ড API কল করে `ads` ডাটা নিয়ে আসবে।
2. পাবলিক পেজের বিভিন্ন জায়গায় (যেমন `<div id="ad-slot-community_sidebar"></div>`) ডাটা অনুযায়ী AdSense কোড ইনজেক্ট করবে অথবা ম্যানুয়াল `<img>` ট্যাগ রেন্ডার করবে। ম্যানুয়াল অ্যাডের ডেট এক্সপায়ার হয়ে গেলে অটোমেটিক হাইড হয়ে যাবে।
