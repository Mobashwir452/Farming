# Admin UI Specification: Roles & Access Management

## 1. Overview
এই পেজটির মাধ্যমে 'Super Admin' নতুন স্টাফ (Editor, Moderator, Support, etc.) যুক্ত করতে পারবেন এবং কে প্যানেলের কোন কোন সেকশন অ্যাক্সেস করতে পারবে, তা নিয়ন্ত্রণ করতে পারবেন। 

## 2. Key Features & UI Components

### Tab 1: Staff Directory (অ্যাডমিন ও স্টাফ তালিকা)
*   **Active Staff List:** বর্তমান সকল অ্যাডমিন ও এডিটরদের তালিকা (টেবিল ভিউ)।
    *   *কলামসমূহ:* নাম, রোল (Role), ইমেইল/ফোন, স্ট্যাটাস (Active/Suspended), অ্যাকশন বোতাম (Edit/Remove)।
*   **Search & Filter:** নাম দিয়ে খোঁজার বা নির্দিষ্ট রোলের স্টাফ ফিল্টার করার অপশন।

### Tab 2: Add New Staff (নতুন স্টাফ যুক্ত করুন)
*   **Create Account Form:**
    *   ফুল নেম
    *   ইমেইল / ফোন নম্বর
    *   টেম্পোরারি পাসওয়ার্ড (অটো জেনারেট বা টাইপ করার অপশন)
    *   রোল সিলেক্ট করুন (Dropdown: Admin, Editor, Moderator, Support Staff)
*   **Send Invite:** অ্যাকাউন্ট বানানোর পর স্টাফের কাছে লগ-ইন ডিটেইলস এসএমএস বা ইমেইলে পাঠানোর অপশন।

### Tab 3: Role Permissions (অ্যাক্সেস ও পারমিশন)
*   **Granular Access Control:** কোন রোল কি কাজ করতে পারবে তার বিস্তারিত চেকবক্স বা টগল লিস্ট।
*   **Permission Sections:**
    *   *Dashboard View* (অ্যাক্সেস আছে / নেই)
    *   *User & Farmer* (ভিউ / এডিট / ব্যান করার ক্ষমতা)
    *   *AI Prompt Engine* (ভিউ / এডিট করার ক্ষমতা)
    *   *Expert Helpdesk* (টিকিটের রিপ্লাই দেওয়া / টিকিট ক্লোজ করা)
    *   *Community Moderation* (পোস্ট অ্যাপ্রুভ / ডিলিট / ইউজার ব্যান করার ক্ষমতা)
    *   *Broadcast* (এসএমএস/পুশ নোটিফিকেশন পাঠানোর ক্ষমতা)
    *   *Subscriptions & Billing* (পেমেন্ট হিস্ট্রি দেখা / ম্যানুয়াল আপগ্রেড করার ক্ষমতা)
    *   *Roles & Management* (শুধুমাত্র সুপার অ্যাডমিন দেখতে পাবে)

## 3. UI/UX Guidelines
*   **Layout:** অন্যান্য পেজের মতো ক্লিন কার্ড ও ট্যাপ ভিউ।
*   **Role Badges:** বিভিন্ন রোলের জন্য ভিন্ন রঙের ব্যাজ (যেমন- Super Admin: লাল, Editor: নীল, Support: সবুজ)।
*   **Permission Toggles:** পারমিশন সেকশনে অনেকগুলো অপশন থাকবে, তাই সেখানে মডার্ন টগল সুইচ (Toggle Switch) বা ভালো ডিজাইনের চেকবক্স ব্যবহার করা হবে।
*   **Warning Modal:** কাউকে রিমুভ (Remove) করার আগে বা পারমিশন কমানোর আগে একটি পপ-আপ অ্যালার্ট দেখানো হবে।

## 4. Backend & Database Architecture
*   **Database Tables:** 
    *   `admin_roles` (Role_ID, Role_Name)
    *   `admin_users` (ID, User_ID/Phone, Role_ID, Status)
    *   `admin_permissions` (Role_ID, Permission_Key, Is_Allowed)
*   **APIs Required:**
    *   `GET /api/admin/staff/list` (সব স্টাফের লিস্ট আনার জন্য)
    *   `POST /api/admin/staff/create` (নতুন অ্যাকাউন্ট তৈরি ও ইনভাইট পাঠানোর জন্য)
    *   `PUT /api/admin/staff/update-role` (কারো রোল পরিবর্তন করার জন্য)
    *   `PUT /api/admin/staff/status` (স্টাফকে সাসপেন্ড/অ্যাক্টিভ করার জন্য)
    *   `GET /api/admin/roles/permissions/:role_id` (কোনো নির্দিষ্ট রোলের পারমিশন দেখার জন্য)
    *   `PUT /api/admin/roles/permissions/update` (পারমিশন আপডেট সেভ করার জন্য)
