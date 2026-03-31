export const getAiLogs = async (request, env) => {
    try {
        // Fetch the 50 most recent interaction logs
        const { results } = await env.DB.prepare("SELECT * FROM ai_logs ORDER BY id DESC LIMIT 50").all();
        
        return Response.json({ 
            success: true, 
            logs: results || []
        });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const getChatLogs = async (request, env) => {
    try {
        const { results } = await env.DB.prepare(`
            SELECT * FROM ai_chat_logs 
            ORDER BY created_at DESC 
            LIMIT 50
        `).all();
        
        return Response.json({ success: true, logs: results || [] });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const getMissedQueries = async (request, env) => {
    try {
        const { results } = await env.DB.prepare(`
            SELECT * FROM ai_missed_queries 
            ORDER BY created_at DESC 
            LIMIT 50
        `).all();
        
        return Response.json({ success: true, queries: results || [] });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const getSecurityLogs = async (request, env) => {
    try {
        const { results } = await env.DB.prepare(`
            SELECT * FROM admin_audit_logs 
            ORDER BY id DESC 
            LIMIT 50
        `).all();
        
        return Response.json({ success: true, logs: results || [] });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const logSecurityAudit = async (env, adminName, actionType, details) => {
    try {
        await env.DB.prepare(
            "INSERT INTO admin_audit_logs (admin_name, action_type, details) VALUES (?, ?, ?)"
        ).bind(
            adminName || 'Unknown Admin', 
            actionType, 
            typeof details === 'object' ? JSON.stringify(details) : details
        ).run();
    } catch (e) {
        console.error("Failed to insert security log:", e);
    }
};

export const getErrorLogs = async (request, env) => {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 25;
        const offset = (page - 1) * limit;

        const { results } = await env.DB.prepare(`
            SELECT * FROM ai_logs 
            WHERE status = 'failed' 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        const countQuery = await env.DB.prepare(`
            SELECT COUNT(*) as total FROM ai_logs WHERE status = 'failed'
        `).first();

        return Response.json({ 
            success: true, 
            logs: results || [],
            total: countQuery?.total || 0,
            page,
            totalPages: Math.ceil((countQuery?.total || 0) / limit)
        });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
