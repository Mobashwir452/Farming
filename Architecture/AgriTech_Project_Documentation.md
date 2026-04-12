# 🌾 AgriTech Farming Web App — সম্পূর্ণ প্রজেক্ট ডকুমেন্টেশন

> **Tech Stack:** JAMstack · Vanilla HTML/CSS/JS (Frontend) · Cloudflare Worker (Backend) · Cloudflare D1 SQLite (Database) · Cloudflare AI · Google Gemini API · Firebase Auth

---

## 📌 প্রজেক্ট সংক্ষেপ

বাংলাদেশের কৃষকদের জন্য তৈরি একটি AI-চালিত স্মার্ট ফার্মিং ওয়েব অ্যাপ্লিকেশন। এটি কৃষকদের জমি ব্যবস্থাপনা, ফসলের AI পরামর্শ, আয়-ব্যয়ের হিসাব, আবহাওয়া তথ্য, রোগ নির্ণয় এবং কমিউনিটি সাপোর্ট প্রদান করে। সম্পূর্ণ বাংলা ভাষায় কৃষকবান্ধব UI সহ।

---

## 🏗️ প্রজেক্ট আর্কিটেকচার (৩-স্তরীয় সিস্টেম)

```
┌─────────────────────────────────┐
│         PUBLIC FRONTEND          │  ← Vanilla HTML/CSS/JS
│   (কৃষকের অ্যাপ - Public End)    │
├─────────────────────────────────┤
│          ADMIN PANEL             │  ← Vanilla HTML/CSS/JS
│   (অ্যাডমিন প্যানেল - Admin End) │
├─────────────────────────────────┤
│       CLOUDFLARE WORKER          │  ← Node.js (itty-router)
│       (Backend API Server)       │  Edge Runtime
├─────────────────────────────────┤
│     CLOUDFLARE D1 (SQLite)       │  ← Database
│     CLOUDFLARE VECTORIZE         │  ← Vector DB (AI RAG)
│     CLOUDFLARE R2                │  ← Image Storage
│     CLOUDFLARE AI (Llama-3)      │  ← AI Chatbot Engine
│     GOOGLE GEMINI API            │  ← RAG Content Generator
│     FIREBASE AUTH                │  ← OTP Authentication
└─────────────────────────────────┘
```

---

## 📁 ফোল্ডার স্ট্রাকচার

```
Farming/
├── index.html                  # হোমপেজ / ল্যান্ডিং পেজ
├── login.html                  # লগইন পেজ (Firebase OTP)
├── dashboard.html              # মেইন ড্যাশবোর্ড
├── khamar.html                 # খামার লিস্ট পেজ
├── add_land.html               # জমি যুক্ত করা (GPS)
├── land_details.html           # জমির বিস্তারিত ও ফসল ব্যবস্থাপনা
├── land_history.html           # জমির ইতিহাস
├── add_crop.html               # ফসল যুক্ত করা
├── manual_crop_setup.html      # ম্যানুয়াল ফসল সেটআপ
├── plant_tracker.html          # চারা ট্র্যাকার
├── crop_doctor.html            # AI ফসল রোগ নির্ণয়
├── tasks.html                  # দৈনিক কাজের তালিকা
├── hishab.html                 # আয়-ব্যয় হিসাব
├── transactions.html           # লেনদেনের ইতিহাস
├── community.html              # কমিউনিটি ফোরাম
├── weather_details.html        # আবহাওয়া বিস্তারিত
├── profile.html                # কৃষকের প্রোফাইল
├── settings.html               # সেটিংস
├── farm_3d_map.html            # 3D আইসোমেট্রিক ফার্ম ম্যাপ
├── ai_crop_prediction.html     # AI ফসল প্রেডিকশন
├── ai_timeline_tasks.html      # AI টাইমলাইন ও কাজ
│
├── css/                        # পাবলিক CSS ফাইলসমূহ
├── js/                         # পাবলিক JS ফাইলসমূহ
│
├── admin/                      # অ্যাডমিন প্যানেল
│   ├── index.html              # অ্যাডমিন ড্যাশবোর্ড
│   ├── users.html              # ইউজার ম্যানেজমেন্ট
│   ├── manage_crops.html       # ক্রপ মাস্টার ডেটা ম্যানেজমেন্ট
│   ├── ai-engine.html          # AI ইঞ্জিন কন্ট্রোল প্যানেল
│   ├── subscriptions.html      # সাবস্ক্রিপশন ম্যানেজমেন্ট
│   ├── analytics.html          # অ্যানালিটিক্স
│   ├── broadcast.html          # ব্রডকাস্ট মেসেজিং
│   ├── cms.html                # কন্টেন্ট ম্যানেজমেন্ট
│   ├── community_mod.html      # কমিউনিটি মডারেশন
│   ├── helpdesk.html           # হেল্পডেস্ক
│   ├── roles_access.html       # রোল ও অ্যাক্সেস ম্যানেজমেন্ট
│   ├── settings.html           # অ্যাডমিন সেটিংস
│   ├── profile.html            # অ্যাডমিন প্রোফাইল
│   ├── css/                    # অ্যাডমিন CSS
│   ├── js/                     # অ্যাডমিন JS
│   └── components/             # Sidebar, Header
│
└── backend/                    # Cloudflare Worker Backend
    ├── worker.js               # মেইন রাউটার (itty-router)
    ├── utils.js                # Auth Middleware
    ├── wrangler.toml           # Cloudflare Config
    ├── routes/                 # সমস্ত API রাউট
    │   ├── auth.js             # লগইন/প্রোফাইল
    │   ├── farms.js            # খামার CRUD
    │   ├── crops.js            # ফসল CRUD
    │   ├── crop_ai.js          # AI প্রেডিকশন
    │   ├── transactions.js     # আয়-ব্যয়
    │   ├── plants.js           # চারা ট্র্যাকার
    │   ├── public_crop_doctor.js # AI রোগ নির্ণয়
    │   ├── ai_chat.js          # AI চ্যাটবট
    │   ├── ai_engine/          # AI ইঞ্জিন মডিউল
    │   ├── admin.js            # অ্যাডমিন ড্যাশবোর্ড
    │   ├── admin_crops.js      # মাস্টার ক্রপ ম্যানেজমেন্ট
    │   ├── admin_users.js      # ইউজার ম্যানেজমেন্ট
    │   └── admin_subscriptions.js # সাবস্ক্রিপশন ম্যানেজমেন্ট
    ├── services/               # ব্যাকগ্রাউন্ড সার্ভিস
    │   ├── weatherSync.js      # আবহাওয়া ডেটা সিঙ্ক (Daily Cron)
    │   ├── taskChecker.js      # Overdue Task চেকার
    │   ├── limitResetter.js    # মাসিক লিমিট রিসেট
    │   ├── pdfReportGenerator.js # PDF রিপোর্ট
    │   └── r2_cleaner.js       # পুরনো ছবি ক্লিন
    ├── utils/
    │   └── ai_engine.js        # মেইন AI ইঞ্জিন লজিক
    └── schema/                 # Database স্কিমা SQL ফাইলসমূহ
```

---

## 🗄️ ডেটাবেস স্কিমা (Cloudflare D1 SQLite)

| টেবিল | বিবরণ | গুরুত্বপূর্ণ ফিল্ড |
|-------|--------|-------------------|
| `users` | কৃষকের অ্যাকাউন্ট | `phone`, `name`, `district`, `subscription_type` |
| `farms` | খামারের তথ্য | `user_phone`, `name`, `area_shotangsho`, `lat`, `lng` |
| `crops` | চলমান ফসল | `farm_id`, `crop_name`, `timeline_json`, `tasks_state_json`, `notes_json` |
| `crops_master_data` | মাস্টার ক্রপ ডেটা | `crop_name`, `variety_name`, `base_yield_per_shotangsho_kg`, `verified_status` |
| `ai_timeline_cache` | AI ক্যাশ | `crop_name`, `base_cost_taka`, `base_revenue_taka` (প্রতি ১ শতাংশের জন্য) |
| `transactions` | আয়-ব্যয় | `farm_id`, `crop_id`, `type` (income/expense), `amount` |
| `ai_api_keys` | Gemini API Keys | `key`, `status` (active/exhausted) |
| `admin_settings` | গ্লোবাল কনফিগ | আবহাওয়া API Key সহ অন্যান্য |

> ⚠️ **গুরুত্বপূর্ণ নিয়ম:** সমস্ত আর্থিক এবং ফলন হিসাব **১ শতাংশ (Shotangsho)** এককে সংরক্ষিত। JSON ফিল্ড রিড/রাইটে সবসময় `JSON.parse()` / `JSON.stringify()` ব্যবহার করতে হবে।

---

## 🤖 AI আর্কিটেকচার — Cross-Lingual Hybrid RAG

### সমস্যা ও সমাধান
- **সমস্যা:** Cloudflare Llama-3 এর ৮১৯২ টোকেন লিমিট। বাংলা ইউনিকোড টেক্সট ইংরেজির চেয়ে ৩-৫ গুণ বেশি টোকেন খরচ করে।
- **সমাধান:** "ইংরেজিতে চিন্তা করো, বাংলায় কথা বলো" — Cross-Lingual RAG পদ্ধতি।

### AI ফ্লো (৩ ধাপ)

```
১. Google Gemini (Knowledge Generator)
   └─► JSON তৈরি করে: english_guide + bengali_guide
       └─► Cloudflare D1 তে সেভ হয়

২. Cloudflare AI Embeddings (@cf/baai/bge-base-en-v1.5)
   └─► ইংরেজি টেক্সট → Vector Numbers
       └─► Cloudflare Vectorize তে সেভ হয়

৩. Cloudflare Llama-3 (@cf/meta/llama-3-8b-instruct)
   └─► Priority 1: Context Match → ইংরেজি কনটেক্সট + বাংলায় উত্তর
   └─► Priority 2: Pre-trained Fallback → নিজস্ব জ্ঞান থেকে বাংলায়
   └─► Priority 3: Irrelevant Filter → অ-কৃষি প্রশ্ন বিনয়ে এড়ানো
```

---

## 🌐 API এন্ডপয়েন্ট সারসংক্ষেপ

### Public (Farmer) API — Firebase Token প্রয়োজন

| Method | Endpoint | কাজ |
|--------|----------|-----|
| GET | `/api/farms` | সব খামারের লিস্ট |
| POST | `/api/farms` | নতুন খামার তৈরি |
| GET | `/api/farms/:id` | খামারের বিস্তারিত |
| GET | `/api/ai/predict-crop` | AI ফসল প্রেডিকশন (সবচেয়ে জটিল) |
| POST | `/api/crops` | ফসল সেভ করা |
| PUT | `/api/crops/:id/state` | ফসলের টাস্ক আপডেট |
| POST | `/api/crops/:id/notes` | ফসলের ডায়েরি নোট |
| GET | `/api/crops/:id/report` | PDF রিপোর্ট |
| GET/POST | `/api/crops/:id/transactions` | আয়-ব্যয় |

### Admin API — Admin Token প্রয়োজন

| Method | Endpoint | কাজ |
|--------|----------|-----|
| GET/POST/PUT/DELETE | `/api/admin/crops` | মাস্টার ক্রপ ম্যানেজমেন্ট |
| GET/POST | `/api/admin/cache/generate` | AI ক্যাশ ম্যানেজমেন্ট |
| GET | `/api/admin/users` | ইউজার ম্যানেজমেন্ট |
| GET/POST/PUT/DELETE | `/api/admin/packages` | সাবস্ক্রিপশন প্যাকেজ |
| POST | `/api/admin/trigger-ai-verification` | AI দিয়ে ক্রপ ভেরিফিকেশন |

---

## 📱 পাবলিক ফ্রন্টএন্ড — পেজ তালিকা ও বিবরণ

| পেজ | ফাইল | বিবরণ |
|-----|------|--------|
| হোমপেজ | `index.html` | ল্যান্ডিং পেজ, আবহাওয়া উইজেট |
| লগইন | `login.html` | Firebase OTP লগইন |
| ড্যাশবোর্ড | `dashboard.html` | মেইন হোম, দৈনিক কাজ, সারাংশ |
| খামার | `khamar.html` | সব খামারের লিস্ট |
| জমি যুক্ত | `add_land.html` | GPS দিয়ে জমি মাপা |
| জমির বিস্তারিত | `land_details.html` | ফসল, টাইমলাইন, নোট (সবচেয়ে বড় পেজ - ১০২KB) |
| ফসল যুক্ত | `add_crop.html` | AI বা ম্যানুয়াল ফসল যোগ |
| ম্যানুয়াল ক্রপ | `manual_crop_setup.html` | নিজে সেটআপ করা |
| চারা ট্র্যাকার | `plant_tracker.html` | চারা ও বেড ম্যানেজমেন্ট |
| AI ডাক্তার | `crop_doctor.html` | ছবি দিয়ে রোগ নির্ণয় |
| টাস্ক | `tasks.html` | দৈনিক কাজের চেকলিস্ট |
| হিসাব | `hishab.html` | আয়-ব্যয় ড্যাশবোর্ড |
| লেনদেন | `transactions.html` | সব লেনদেনের ইতিহাস |
| কমিউনিটি | `community.html` | কৃষক ফোরাম |
| আবহাওয়া | `weather_details.html` | বিস্তারিত আবহাওয়া |
| প্রোফাইল | `profile.html` | কৃষকের প্রোফাইল |
| সেটিংস | `settings.html` | অ্যাপ সেটিংস |
| 3D ম্যাপ | `farm_3d_map.html` | আইসোমেট্রিক ফার্ম ভিউ |

---

## 🛠️ অ্যাডমিন প্যানেল — পেজ তালিকা ও বিবরণ

| পেজ | ফাইল | বিবরণ |
|-----|------|--------|
| ড্যাশবোর্ড | `admin/index.html` | মেট্রিক্স, সিস্টেম সারাংশ |
| ইউজার | `admin/users.html` | কৃষক ও ইউজার ম্যানেজমেন্ট |
| ক্রপ ম্যানেজ | `admin/manage_crops.html` | মাস্টার ক্রপ ডেটাবেস |
| AI ইঞ্জিন | `admin/ai-engine.html` | RAG জেনারেশন, AI অডিট লগ (৫৫KB — সবচেয়ে বড়) |
| সাবস্ক্রিপশন | `admin/subscriptions.html` | প্যাকেজ, পেমেন্ট অনুমোদন |
| অ্যানালিটিক্স | `admin/analytics.html` | রিপোর্ট ও চার্ট |
| ব্রডকাস্ট | `admin/broadcast.html` | কৃষকদের মেসেজ পাঠানো |
| CMS | `admin/cms.html` | কন্টেন্ট ম্যানেজমেন্ট ও বিজ্ঞাপন |
| কমিউনিটি | `admin/community_mod.html` | পোস্ট মডারেশন |
| হেল্পডেস্ক | `admin/helpdesk.html` | সাপোর্ট টিকেট |
| রোল | `admin/roles_access.html` | RBAC রোল ও পারমিশন |
| সেটিংস | `admin/settings.html` | গ্লোবাল কনফিগারেশন |

---

## ⚙️ ব্যাকগ্রাউন্ড সার্ভিস (Cron Jobs)

| সার্ভিস | ফাইল | ট্রিগার | কাজ |
|---------|------|---------|-----|
| Weather Sync | `weatherSync.js` | রাত ২টা (Daily) | আবহাওয়া ডেটা আপডেট |
| Task Checker | `taskChecker.js` | Daily Cron | Overdue টাস্ক চেক |
| Limit Resetter | `limitResetter.js` | মাসিক | API লিমিট রিসেট |
| R2 Cleaner | `r2_cleaner.js` | Scheduled | পুরনো ছবি মুছা |
| Crop Verification | `cron_verification.js` | Admin Trigger | AI দিয়ে ক্রপ ভেরিফাই |

---

## 🔐 অথেন্টিকেশন সিস্টেম

- **Firebase OTP Auth** — মোবাইল নম্বর দিয়ে লগইন (No password)
- **JWT Token** — API কলে Bearer Token
- **Admin Token** — আলাদা Admin Access Token (wrangler secret)
- **RBAC** — Role-Based Access Control (admin, moderator, support)
- **Auth Guard** — `js/auth-guard.js` — সব পেজে অটো-রিডাইরেক্ট

---

## 💰 সাবস্ক্রিপশন মডেল

- **Free Plan** — সীমিত ফিচার
- **Premium Plans** — বিভিন্ন প্যাকেজ (অ্যাডমিন থেকে কাস্টমাইজযোগ্য)
- **Manual Payment** — bKash/Nagad পেমেন্ট → Admin অনুমোদন
- **Auto Downgrade** — মেয়াদ শেষে অটো Free তে ফেরা

---

## 🎯 টার্গেট ইউজার পার্সোনা (১০ ধরনের ইউজার)

1. **ঐতিহ্যবাহী প্রান্তিক কৃষক** (রংপুর) — খুব কম টেক দক্ষতা
2. **তরুণ প্রগতিশীল কৃষক** (বগুড়া) — YouTube দেখে আধুনিক চাষ শেখে
3. **নারী ক্ষুদ্র কৃষক** (খুলনা) — হোমস্টেড ফার্মিং
4. **বর্গা চাষী** (দিনাজপুর) — প্রতিটি টাকার হিসাব রাখে
5. **অবিশ্বাসী অভিজ্ঞ কৃষক** (রাজশাহী) — প্রযুক্তিতে সন্দিহান
6. **কৃষি ডিলার** (যশোর) — সার-বীজ বিক্রেতা
7. **এনজিও ফিল্ড এজেন্ট** (বরিশাল) — ৫০+ কৃষক পরিচালনা
8. **ব্যাংক লোন অফিসার** (ঢাকা) — ক্রেডিট রিস্ক অ্যাসেসমেন্ট
9. **বড় বাণিজ্যিক কৃষক** (চুয়াডাঙ্গা) — ১৫+ একর জমি
10. **সরকারি কৃষি বিশেষজ্ঞ** (মন্ত্রণালয়) — জরুরি সতর্কতা ব্রডকাস্ট

---

## 🧩 মূল ফিচার সমূহ

### ১. GPS জমি মাপা
- কৃষক হেঁটে জমির চারপাশ ঘুরলে GPS দিয়ে অটো এরিয়া ক্যালকুলেশন
- ফলাফল শতাংশে (Shotangsho) দেখায়

### ২. AI ফসল প্রেডিকশন
- জমির আকার ও এলাকার ভিত্তিতে সেরা ফসলের পরামর্শ
- AI জেনারেটেড ফসলের টাইমলাইন, খরচ, আয়ের হিসাব

### ৩. AI Crop Doctor (রোগ নির্ণয়)
- ফসলের ছবি তুলে রোগ শনাক্ত
- ওষুধ ও সমাধানের পরামর্শ

### ৪. Cross-Lingual AI Chatbot
- Llama-3 + Cloudflare Vectorize RAG সিস্টেম
- বাংলায় কৃষি প্রশ্নের উত্তর

### ৫. আয়-ব্যয় ট্র্যাকার (হিসাব)
- প্রতিটি ফসলের আলাদা আয়-ব্যয় ট্র্যাকিং
- BCR (Benefit-Cost Ratio) ক্যালকুলেশন

### ৬. 3D আইসোমেট্রিক ফার্ম ম্যাপ
- ভিজ্যুয়াল ফার্ম ওভারভিউ
- চারা ও বেড ম্যানেজমেন্ট

### ৭. কমিউনিটি ফোরাম
- কৃষকদের মধ্যে তথ্য শেয়ার
- অ্যাডমিন মডারেশন সহ

### ৮. আবহাওয়া ইন্টিগ্রেশন
- প্রতিদিন অটো আবহাওয়া সিঙ্ক
- ৭ দিনের পূর্বাভাস

### ৯. Admin AI Engine
- Google Gemini দিয়ে RAG কনটেন্ট জেনারেশন
- AI Audit Log, ক্যাশ ম্যানেজমেন্ট

### ১০. সাবস্ক্রিপশন + পেমেন্ট সিস্টেম
- Manual Payment অনুমোদন ওয়ার্কফ্লো
- RBAC-ভিত্তিক ফিচার অ্যাক্সেস

---

## 🖥️ Cloudflare Infrastructure

| সার্ভিস | ব্যবহার |
|---------|---------|
| **Cloudflare Workers** | Edge Runtime API Server (itty-router) |
| **Cloudflare D1** | Serverless SQLite Database |
| **Cloudflare Vectorize** | AI Vector Database (RAG) |
| **Cloudflare R2** | Image Storage (ফসলের ছবি) |
| **Cloudflare AI** | Llama-3 (Chatbot) + Embeddings |
| **Cloudflare KV** | (সম্ভাব্য ক্যাশিং) |

---

## ⚠️ গুরুত্বপূর্ণ ডেভেলপমেন্ট নিয়মাবলী

1. **শতাংশ (Shotangsho) একক** — সব ফলন ও খরচ ১ শতাংশের হিসাবে রাখতে হবে। কখনো বিঘা/একর ডেটাবেসে সংরক্ষণ করা যাবে না।
2. **JSON ফিল্ড** — DB-তে Object সেভ/রিড করতে সবসময় `JSON.stringify()` / `JSON.parse()` ব্যবহার করতে হবে।
3. **Error Handling** — Frontend থেকে API কলে সবসময় `try-catch` এবং `success: false` চেক করতে হবে।
4. **Token Security** — API Key গুলো `wrangler secret put` দিয়ে সেট করতে হবে, কোনোভাবেই কোডে হার্ডকোড করা যাবে না।
5. **Cross-Lingual Context** — AI-কে সবসময় ইংরেজি কনটেক্সট দিয়ে বাংলায় রেসপন্স নিতে হবে।

---

## 📊 প্রজেক্ট স্ট্যাটিস্টিক্স

| মেট্রিক | সংখ্যা |
|---------|--------|
| মোট ফাইল | ~২৬৬টি |
| পাবলিক HTML পেজ | ১৮টি |
| অ্যাডমিন HTML পেজ | ১২টি |
| পাবলিক JS ফাইল | ২৪টি |
| পাবলিক CSS ফাইল | ২০টি |
| ব্যাকএন্ড রাউট ফাইল | ১৫টি |
| ডেটাবেস স্কিমা ফাইল | ১৫টি |
| আর্কিটেকচার ডকস | ৭টি |
| স্পেসিফিকেশন ডকস | ২০টি |

---

*এই ডকুমেন্টটি AgriTech Farming প্রজেক্টের GitHub রিপো বিশ্লেষণ করে তৈরি করা হয়েছে।*
*তৈরির তারিখ: ০৮ এপ্রিল ২০২৬*
