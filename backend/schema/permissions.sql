-- Create standard permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Basic Set of Permissions
INSERT INTO permissions (permission_name, description) VALUES 
('view_dashboard', 'Can view the main dashboard'),
('manage_users', 'Can view, edit, or delete users'),
('manage_roles', 'Can create or modify roles and permissions'),
('manage_cms', 'Can modify homepage content and ad spots'),
('manage_settings', 'Can edit general settings and scripts'),
('manage_subscriptions', 'Can add or edit subscription packages'),
('view_analytics', 'Can view advanced financial and traffic reports')
ON CONFLICT DO NOTHING;
