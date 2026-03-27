export const getApiKeys = async (request, env) => {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const { results } = await env.DB.prepare(`
            SELECT id, api_key, status, today_usage, total_usage, last_used, reset_date 
            FROM ai_api_keys 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        const countRow = await env.DB.prepare("SELECT COUNT(*) as total FROM ai_api_keys").first();
        const total = countRow ? countRow.total : 0;

        return Response.json({ success: true, keys: results || [], total, page, limit });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const addApiKeys = async (request, env) => {
    try {
        const body = await request.json();
        const keys = body.keys || []; 

        const statements = keys.map(k => {
            return env.DB.prepare("INSERT OR IGNORE INTO ai_api_keys (api_key) VALUES (?)").bind(k);
        });

        if (statements.length > 0) {
            await env.DB.batch(statements);
        }

        return Response.json({ success: true, message: 'API Keys added successfully' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const toggleApiKey = async (request, env) => {
    try {
        const id = request.params.id;
        const body = await request.json();
        const status = body.status; // 'active' or 'disabled'

        await env.DB.prepare("UPDATE ai_api_keys SET status = ?, reset_date = NULL WHERE id = ?").bind(status, id).run();
        
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const deleteApiKey = async (request, env) => {
    try {
        const id = request.params.id;
        await env.DB.prepare("DELETE FROM ai_api_keys WHERE id = ?").bind(id).run();
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
