-- backend/schema/tasks.sql
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    crop_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    task_description TEXT,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Completed', 'Skipped'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_crop ON tasks(crop_id);
