import { json, error } from 'itty-router';

export const getAiStats = async (request, env) => {
    try {
        // 1. API Keys Status
        const keyStats = await env.DB.prepare("SELECT COUNT(*) as total_keys, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active_keys FROM ai_api_keys").first();
        
        // 2. Query Logs & Success Rate
        const totalResult = await env.DB.prepare("SELECT COUNT(*) as total FROM ai_logs").first();
        const successResult = await env.DB.prepare("SELECT COUNT(*) as count FROM ai_logs WHERE status = 'success'").first();
        
        const totalQueries = totalResult ? (totalResult.total || 0) : 0;
        const successCount = successResult ? (successResult.count || 0) : 0;
        
        let successRate = 0;
        if (totalQueries > 0) {
            successRate = ((successCount / totalQueries) * 100).toFixed(1);
        }

        const hrsSaved = successCount * 2;

        // 3. Feature Breakdown
        const { results: featureCounts } = await env.DB.prepare("SELECT feature_type as feature, COUNT(*) as count FROM ai_logs GROUP BY feature_type").all();

        // 4. Exhausted Quota Timers
        const { results: exhaustedKeys } = await env.DB.prepare("SELECT id, reset_date FROM ai_api_keys WHERE status = 'exhausted' ORDER BY reset_date ASC").all();

        // 5. Trending Crops
        const { results: trending } = await env.DB.prepare("SELECT crop_name, COUNT(*) as hit_count FROM ai_logs WHERE crop_name IS NOT NULL GROUP BY crop_name ORDER BY hit_count DESC LIMIT 5").all();

        // 6. Recent Error Logs
        const { results: recentErrors } = await env.DB.prepare("SELECT feature_type, crop_name, error_message, created_at FROM ai_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5").all();

        // 7. Crop Doctor Vision Metrics
        const cdTotal = await env.DB.prepare("SELECT COUNT(*) as count FROM crop_scans").first();
        const cdValid = await env.DB.prepare("SELECT COUNT(*) as count FROM crop_scans WHERE status != 'not_a_crop'").first();
        const { results: topDiseases } = await env.DB.prepare("SELECT disease_name_bn as name, COUNT(*) as hit_count FROM crop_scans WHERE status = 'disease_detected'  AND disease_name_bn IS NOT NULL GROUP BY disease_name_bn ORDER BY hit_count DESC LIMIT 5").all();

        const totalScans = cdTotal ? (cdTotal.count || 0) : 0;
        const validScans = cdValid ? (cdValid.count || 0) : 0;
        let visionSuccessRate = 0;
        if (totalScans > 0) {
            visionSuccessRate = ((validScans / totalScans) * 100).toFixed(1);
        }

        return json({ 
            success: true, 
            stats: {
                total_keys: keyStats ? (keyStats.total_keys || 0) : 0,
                active_keys: keyStats ? (keyStats.active_keys || 0) : 0,
                total_queries: totalQueries,
                success_rate: parseFloat(successRate),
                failed_rate: parseFloat((100 - successRate).toFixed(1)),
                hours_saved: hrsSaved,
                feature_breakdown: featureCounts || [],
                exhausted_keys: exhaustedKeys || [],
                trending: trending || [],
                recent_errors: recentErrors || [],
                vision_metrics: {
                    total_scans: totalScans,
                    success_rate: parseFloat(visionSuccessRate),
                    top_diseases: topDiseases || []
                }
            } 
        });
    } catch (e) {
        return error(500, e.message);
    }
};
