CREATE TABLE IF NOT EXISTS ai_rag_documents (
    id TEXT PRIMARY KEY,
    crop_name TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    source_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
