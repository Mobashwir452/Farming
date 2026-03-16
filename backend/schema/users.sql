-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Insert Default Super Admin User
-- Email: mobashwir9@gmail.com
-- Password: mobashwir9@gmail.com
-- Note: The password_hash below is a bcrypt hash of "mobashwir9@gmail.com" (cost factor 10).
INSERT INTO users (name, email, password_hash, role_id) 
VALUES (
    'Mobashwir (Admin)', 
    'mobashwir9@gmail.com', 
    '$2a$10$wN14nKItIay2Z2nKj9nEceMQQ8xXOKu7sWjEOnvO5q.v4TqP9lP6O', 
    1
) ON CONFLICT DO NOTHING;
