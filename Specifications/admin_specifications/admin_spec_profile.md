# Admin UI Specification: Profile Settings

## 1. Overview
এই পেজটি বর্তমান লগ-ইন করা অ্যাডমিন বা এডিটরের ব্যক্তিগত তথ্য, সিকিউরিটি আপডেট এবং নিজের করা কাজের হিস্ট্রি দেখার জন্য তৈরি করা হবে।

## 2. Key Features & UI Components

### Tab 1: Personal Information (ব্যক্তিগত তথ্য)
*   **Profile Picture:** ছবি আপলোড বা পরিবর্তনের অপশন।
*   **Basic Details:** ফুল নেম, ফোন নম্বর এবং ইমেইল অ্যাড্রেস আপডেট করার ইনপুট ফিল্ড।
*   **Designation/Role:** বর্তমান রোল বা পদবি (যেমন- Super Admin, Content Editor) দেখানোর জন্য রিড-অনলি ফিল্ড।
*   **Save Button:** তথ্য আপডেট করার বাটন।

### Tab 2: Security (নিরাপত্তা)
*   **Change Password:** বর্তমান পাসওয়ার্ড (Current Password), নতুন পাসওয়ার্ড (New Password), এবং নতুন পাসওয়ার্ড নিশ্চিতকরণ (Confirm Password) ফিল্ড।
*   **Two-Factor Authentication (2FA):** বাড়তি নিরাপত্তার জন্য লগ-ইনের সময় OTP চালু বা বন্ধ করার টগল।
*   **Active Sessions:** বর্তমানে কোন কোন ব্রাউজার বা ডিভাইসে অ্যাকাউন্টটি লগ-ইন করা আছে তার তালিকা এবং "Sign out from all devices" বাটন।

### Tab 3: Activity Log (অ্যাক্টিভিটি লগ / আমার কাজ)
*   **Recent Actions:** অ্যাডমিন নিজে প্যানেলে লাস্ট কি কি কাজ করেছেন তার একটি টাইমলাইন বা টেবিল (যেমন: "একটি কমিউনিটি পোস্ট ডিলিট করেছেন", "নতুন প্যাকেজ বানিয়েছেন")।
*   **Timestamps:** প্রতিটি কাজের তারিখ ও সময়।

## 3. UI/UX Guidelines
*   **Layout:** অন্যান্য পেজের মতো ক্লিন কার্ড ও ট্যাপ ভিউ।
*   **Input Fields:** `admin-global.css` এর `form-input` ক্লাস ব্যবহার করা হবে।
*   **Security Focus:** পাসওয়ার্ড এবং 2FA অংশে ক্লিয়ার ইনস্ট্রাকশন এবং ওয়ার্নিং থাকবে (যেমন: "আপনার পাসওয়ার্ড কারো সাথে শেয়ার করবেন না")।

## 4. Backend & Database Architecture
*   **Database Tables:** 
    *   `admin_users` (Name, Email, Phone, Password Hash, 2FA_Enabled, etc.)
    *   `admin_activity_logs` (Admin_ID, Action_Type, Target_ID, Timestamp)
    *   `admin_sessions` (Admin_ID, Device_Name, IP_Address, Last_Active)
*   **APIs Required:**
    *   `POST /api/admin/profile/update` (নাম, ছবি আপডেট করার জন্য)
    *   `POST /api/admin/profile/change-password` (পাসওয়ার্ড পরিবর্তনের জন্য)
    *   `POST /api/admin/profile/toggle-2fa` (2FA অন/অফ করার জন্য)
    *   `GET /api/admin/profile/activity-log` (কাজের হিস্ট্রি আনার জন্য)
    *   `POST /api/admin/profile/logout-device` (নির্দিষ্ট ডিভাইস থেকে সাইন আউট করার জন্য)
