# Admin Settings > Database Tab (Image Compression) Error Report

## Problem Summary

`General Settings -> ডাটাবেজ ও টুলস -> ইমেজ ব্যাচ কম্প্রেশন` চালানোর সময় Console-এ multiple `404 (Not Found)` আসছে, তাই uncompressed image scan/compress process শুরু হলেও backend operation fail করছে।

## Root Cause (Why this is happening)

`admin/settings.html`-এর `startAdminBatchCompression()` ফাংশনে যেসব API call করা হচ্ছে, সেগুলোর সাথে backend route definition mismatch আছে।

### 1) Wrong endpoint used for bed list
- Frontend call: `GET /api/crops/:cropId/beds`
- Existing backend route: `GET /api/crops/:id/plants`
- ফলাফল: `404 Not Found`

### 2) Role mismatch (Admin tab using Farmer-only routes)
- Compression tool admin page থেকে চালানো হচ্ছে (admin token)
- কিন্তু image upload/update routes farmer role-এ protected:
  - `POST /api/crops/:id/upload-image` -> `withAuth(['farmer'])`
  - `PUT /api/crops/:id/beds/:bedId` -> `withAuth(['farmer'])`
- ফলাফল: admin দিয়ে call করলে permission fail (implementation অনুযায়ী error behaviour ভিন্ন দেখা যেতে পারে)

### 3) Upload payload/response contract mismatch
- Frontend body পাঠাচ্ছে:
  - `{ image_base64, image_format }`
- Backend `uploadPlantImage()` expect করে:
  - `{ imageBase64, filename }`
- Backend response দেয় `url`, কিন্তু frontend expect করছে `image_url`
- ফলাফল: upload success হলেও frontend logic fail করবে

### 4) Base64 format mismatch risk
- Frontend `_blobToBase64()` raw base64 string দেয়
- Backend `uploadPlantImage()` remove করতে চায় `data:image/...;base64,` prefix
- prefix না থাকলেও কিছু ক্ষেত্রে কাজ করতে পারে, কিন্তু contract explicit না হওয়ায় bug-prone

---

## Exact Fix Plan

## Option A (Recommended): Admin-specific backend compression endpoint বানানো

সব compression logic frontend থেকে না করে backend admin route-এ করো।

### Steps
1. নতুন route add করো:
   - `POST /api/admin/dbtools/compress-images`
   - auth: `withAuth(['admin'])`
2. backend-এ crop -> beds -> logs scan করে image compress/upload/update করো (R2 + DB update server-side)
3. response হিসেবে progress summary দাও:
   - `total`, `compressed`, `skipped`, `failed`, `errors[]`
4. frontend থেকে single API call trigger করো এবং result UI-তে দেখাও

### কেন ভালো
- Admin context clean থাকবে
- CORS/canvas/image fetch সমস্যা কমবে
- role mismatch দূর হবে
- heavy কাজ browser-এর বদলে server-side হবে

---

## Option B (Quick Patch): Existing frontend flow ঠিক করা

যদি এখনই minimal change দিতে চাও, নিচের mappings fix করতে হবে:

1. `GET /api/crops/:id/beds` -> `GET /api/crops/:id/plants`
2. upload body:
   - from: `{ image_base64, image_format }`
   - to: `{ imageBase64: 'data:image/webp;base64,...', filename: '<unique-name>' }`
3. upload response ব্যবহার:
   - from: `uploadData.image_url`
   - to: `uploadData.url`
4. `POST /api/crops/:id/upload-image` এবং `PUT /api/crops/:id/beds/:bedId` route-এ admin access যোগ করতে হবে:
   - `withAuth(['farmer', 'admin'])`
   - অথবা admin-only mirror route বানাতে হবে (`/api/admin/...`)

---

## Files Involved

- `admin/settings.html` (Database tab compression JS logic)
- `backend/worker.js` (route map)
- `backend/routes/plants.js` (`uploadPlantImage`, `getPlantGrid`, `updateBedConfig`)
- `backend/utils.js` (`withAuth` RBAC)

---

## Verification Checklist (After Fix)

1. Database tab থেকে compression শুরু করলে আর `404` না আসে
2. কমপক্ষে ১টা non-webp image successfully webp-তে upload হয়
3. `plants_nodes_json`-এ image URL update হয়
4. final stats row (`total/compressed/skipped`) expected value দেখায়
5. repeat run দিলে already webp images correctly skip হয়

---

## Short Conclusion

এই error-এর প্রধান কারণ হলো **frontend API contract ও backend route/auth contract mismatch**।  
Best solution হলো admin compression process backend admin endpoint-এ shift করা; quick workaround হলো existing endpoint, payload, response key, এবং RBAC একসাথে align করা।

