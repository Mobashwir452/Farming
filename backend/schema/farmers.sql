-- backend/schema/farmers.sql
-- Table to store public users who authenticate via Firebase Phone Auth

CREATE TABLE IF NOT EXISTS farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid TEXT NOT NULL UNIQUE,  -- The UID from Firebase Authentication
    phone_number TEXT NOT NULL UNIQUE,  -- E.164 format (+880...)
    full_name TEXT,                     -- Collected during step 4 of signup
    pin_hash TEXT,                      -- Secured local PIN (backup/alternative auth)
    is_active BOOLEAN DEFAULT 1,        -- Whether the account is active/banned
    subscription_status TEXT DEFAULT 'free', -- 'free' or 'pro'
    subscription_expiry DATETIME NULL,
    remaining_scans INTEGER DEFAULT 3,
    remaining_timelines INTEGER DEFAULT 5,
    remaining_chats INTEGER DEFAULT 15,
    fcm_token TEXT,                     -- Firebase FCM Notification token
    email TEXT,                         -- Optional email for testing / notifications
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups during auth
CREATE INDEX IF NOT EXISTS idx_farmers_firebase_uid ON farmers(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone_number);
