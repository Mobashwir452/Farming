export const getAiStats = async (request, env) => {
    try {
        // Count total active keys
        const keysResult = await env.DB.prepare("SELECT COUNT(*) as count FROM ai_api_keys WHERE status = 'active'").first();
        const activeKeys = keysResult ? keysResult.count : 0;
        
        // Count total queries processed
        const logsResult = await env.DB.prepare("SELECT COUNT(*) as count FROM ai_logs").first();
        const totalQueries = logsResult ? logsResult.count : 0;
        
        // Count queries per feature
        const { results: featureCounts } = await env.DB.prepare("SELECT feature, COUNT(*) as count FROM ai_logs GROUP BY feature").all();
        
        // Count total tokens used
        const tokensResult = await env.DB.prepare("SELECT SUM(tokens_used) as total FROM ai_logs").first();
        const tokensUsed = tokensResult ? (tokensResult.total || 0) : 0;

        return Response.json({ 
            success: true, 
            stats: {
                active_keys: activeKeys,
                total_queries: totalQueries,
                tokens_used: tokensUsed,
                feature_breakdown: featureCounts || []
            } 
        });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
