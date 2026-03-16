-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Insert default Super Admin role
INSERT INTO roles (id, role_name, description) VALUES (1, 'Super Admin', 'Has full access to all system features') ON CONFLICT DO NOTHING;
