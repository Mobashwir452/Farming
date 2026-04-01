-- Packages Table (For Tab 1)
CREATE TABLE IF NOT EXISTS subscription_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,          -- e.g., "Free Plan", "Premium (6 Months)"
    price_bdt INTEGER DEFAULT 0,
    duration_months INTEGER DEFAULT 0,
    scan_limit INTEGER DEFAULT 3,
    timeline_limit INTEGER DEFAULT 5,
    chat_limit INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payments History Table (For Tab 3 and Tab 4)
CREATE TABLE IF NOT EXISTS subscription_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER NOT NULL,
    package_id INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL,
    payment_method TEXT DEFAULT 'manual', -- 'bkash', 'nagad', 'cash_office'
    trx_id TEXT,                          -- bkash TrxID or Admin Reference
    status TEXT DEFAULT 'approved',       -- 'pending', 'approved', 'rejected'
    approved_by_admin_id INTEGER,         -- Which admin approved it
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(farmer_id) REFERENCES farmers(id),
    FOREIGN KEY(package_id) REFERENCES subscription_packages(id),
    FOREIGN KEY(approved_by_admin_id) REFERENCES roles(id) -- Assuming roles maps to admin users
);
