Admin Specification: Broadcast & Limits (ব্রডকাস্ট ও লিমিটস)
১. ওভারভিউ (Overview)
অ্যাডমিন প্যানেলের "ব্রডকাস্ট ও লিমিটস" পেজটির মূল কাজ হলো একসাথে অনেক ইউজারকে মেসেজ পাঠানো (Broadcast) এবং সিস্টেমের কিছু বেসিক সিকিউরিটি ও স্প্যাম লিমিট (System Limits) কন্ট্রোল করা।

(বি.দ্র: ইউজারদের ব্যক্তিগত AI লিমিট এবং সাবস্ক্রিপশন প্ল্যান সম্পূর্ণ আলাদা একটি "Subscriptions" পেজে ম্যানেজ করা হবে, এখানে শুধু সিস্টেম লিমিট থাকবে।)

২. ব্রডকাস্ট (Mass Messaging)
ব্রডকাস্ট মানে হলো একইসাথে অনেক ইউজারকে বা নির্দিষ্ট কোনো এরিয়ার কৃষকদের এলার্ট বা নোটিফিকেশন দেওয়া।

পাবলিক অ্যাপে এর প্রভাব:

কৃষকদের অ্যাপের নোটিফিকেশন সেকশন (Notification Bell)-এ মেসেজ যাবে।
মোবাইলের স্ক্রিনে সরাসরি Push Notification হিসেবে পপ-আপ আসবে।
অ্যাডমিন প্যানেলের ব্রডকাস্ট ফিচারসমূহ:

Audience Selection: অ্যাডমিন সিলেক্ট করতে পারবেন মেসেজটি কাকে যাবে।
All Users (সবাইকে)
Specific Area (যেমন: শুধুমাত্র বগুড়া জেলার কৃষকদের)
Message Body: মেসেজের শিরোনাম, বিস্তারিত লেখা এবং চাইলে কোনো লিংক (যেমন: ইউটিউব ভিডিও লিংক) বা ছবি অ্যাড করার ফিল্ড।
৩. বেসিক সিস্টেম লিমিটস (System Rate Limits)
স্প্যাম এবং বট অ্যাটাক থেকে সিস্টেমকে নিরাপদ রাখতে এই পেজ থেকে কিছু গ্লোবাল লিমিট সেট করা হবে:

OTP Limits: একজন ইউজার রেজিস্ট্রেশন বা লগইন করার জন্য দিনে সর্বোচ্চ কয়বার OTP রিকোয়েস্ট দিতে পারবে (যেমন: ৫ বার)।
৪. ইউআই ভিউ (UI Outline)
এই পেজটির লেআউট ২ ভাগে বিভক্ত থাকবে:

বাম দিক (Left Column): "Create Broadcast" ফর্ম, যেখানে মেসেজের টাইটেল সাবমিট করার অপশন থাকবে।
ডান দিক (Right Column): "System Limits" কন্ট্রোল প্যানেল (OTP limit number boxes) এবং আগে পাঠানো ব্রডকাস্টের লগ (Previous Broadcasts History)।
৫. ব্যাকএন্ড ও এপিআই ফ্লো (Backend & API Flow)
এই পেজটি পরিচালনা করার জন্য ব্যাকএন্ডে যে ফ্লো কাজ করবে:

ডাটাবেস টেবিল:
system_broadcasts (id, title, message, target_audience, created_at, status)
system_limits (id, limit_name, limit_value, updated_at)
API এন্ডপয়েন্ট:
POST /api/admin/broadcast/send - নতুন ব্রডকাস্ট মেসেজ পাঠানো (Firebase Push Notification বা SMS Gateway ট্রিগার করবে)।
GET /api/admin/broadcast/history - আগের পাঠানো ব্রডকাস্টের তালিকা আনার জন্য।
GET /api/admin/system-limits - বর্তমান সিস্টেম লিমিট (যেমন OTP limit) ভ্যালু আনার জন্য।
PUT /api/admin/system-limits - নতুন লিমিট সেভ করার জন্য।