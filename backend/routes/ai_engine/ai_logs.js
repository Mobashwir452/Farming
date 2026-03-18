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
