# কেন সব ছবি `skipped` দেখাচ্ছে + Plant Tracker-এর মতো সঠিকভাবে compression করার গাইড

## তোমার স্ক্রিনশটের ফলাফল কী বোঝায়

- `Total: 21, Compressed: 0, Skipped: 21` মানে job ২১টা image পেয়েছে, কিন্তু সবগুলোকে already-compressed/WebP ধরে skip করেছে।
- বর্তমান scanner `crop_beds.plants_nodes_json -> node.logs[].image_url` থেকে image নেয়।
- Plant Tracker flow-এ নতুন ছবি upload হওয়ার আগে client-side এ `canvas.toDataURL('image/webp', 0.8)` দিয়ে compress হয়, তারপর upload হয়। তাই অনেক image naturally `.webp` হয়।

---

## Root Causes (প্র্যাক্টিক্যাল)

## 1) URL-based detection খুব simplistic
এখন skip check হচ্ছে শুধু URL দেখে:
- `.webp` আছে?
- `format=webp` আছে?

যদি URL webp pattern match করে, সেটা skip হচ্ছে — even যদি actual object type mismatch হয়।

## 2) Data source coverage incomplete হতে পারে
compression endpoint শুধু `plants_nodes_json` scan করছে।  
project-এ `plant_logs` table-ও আছে; legacy/older image সেখানে থাকতে পারে।

ফলে:
- যেগুলো `plants_nodes_json`-এ আছে সেগুলো mostly webp -> skipped
- যেগুলো `plant_logs` table-এ jpg/png আছে সেগুলো scan-এই আসছে না

## 3) Plant Tracker already compresses on upload
`js/plant_tracker.js`-এ:
- `compressImageWebP(...)`
- তারপর `/api/crops/:id/upload-image` এ webp upload

তাই recent images compressed হওয়াটাই expected behavior।

---

## কী করলে “Plant Tracker-এর মতো” reliable হবে

## A) Detection URL নয়, actual content-type based করো

`admin_dbtools` endpoint-এ skip করার আগে:
1. image URL থেকে key parse করো
2. `env.IMAGE_BUCKET.head(key)` দিয়ে object metadata নাও
3. `contentType === 'image/webp'` হলে skip
4. না হলে compress করো

এতে false skip কমবে।

## B) Dual-source scan add করো

একই job-এ 2 source scan করো:
- Source-1: `crop_beds.plants_nodes_json` (current)
- Source-2: `plant_logs.image_url` (legacy/migrated data)

`plant_logs` source থেকে compress করলে DB update:
- `UPDATE plant_logs SET image_url = ? WHERE id = ?`

## C) Image URL class-wise handling করো

1. **R2 public URL** (`/api/public/images/...`)  
   -> key parse -> head -> compress -> নতুন key save -> URL replace

2. **External URL** (old CDN/mock/etc.)  
   -> fetch + transform করে internal R2 key তে save  
   -> URL replace with your worker public URL

## D) Improve stats for clarity

একই `skipped` না দেখিয়ে split করো:
- `skipped_webp`
- `skipped_missing_or_invalid_url`
- `skipped_unreadable_object`
- `failed_transform`

এতে instantly বোঝা যাবে আসল কারণ।

---

## Quick verification steps (production-safe)

1. প্রথমে `dry_run: true` দিয়ে run করো  
2. logs-এ source-wise count verify করো:
   - beds source কত
   - plant_logs source কত
3. ৫-১০টা sample URL DB থেকে নিয়ে check করো:
   - before: jpg/png?
   - after run: webp URL?
4. দ্বিতীয়বার run দিলে expected:
   - `compressed` কম/0
   - `skipped_webp` বেশি

---

## DB query দিয়ে এখনই confirm করতে পারো

(এই query idea dev-check এর জন্য)

- `crop_beds` JSON-এ jpg/png count estimate
- `plant_logs` টেবিলে image_url extension count

যদি `plant_logs`-এ non-webp বেশি পাওয়া যায়, তাহলে current endpoint কেন “সব skipped” দেখাচ্ছে সেটা clear হয়ে যাবে।

---

## Short action plan

1. `admin_dbtools`-এ content-type based skip logic add  
2. `plant_logs` table scan + update যুক্ত করো  
3. stats breakdown improve করো  
4. dry-run + sample validation করে full run দাও

এই ৪টা করলে “Plant Tracker-এর মতো বাস্তব compression” consistently কাজ করবে এবং false skip কমে যাবে।

