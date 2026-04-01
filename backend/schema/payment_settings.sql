CREATE TABLE IF NOT EXISTS payment_settings (
    method_name TEXT PRIMARY KEY,
    number TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO payment_settings (method_name, number) VALUES 
('bkash', '+880 1323 000 000'),
('nagad', '+880 1323 000 000')
ON CONFLICT(method_name) DO UPDATE SET number = excluded.number;
