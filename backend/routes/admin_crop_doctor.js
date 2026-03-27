export const getScanLogs = async (request, env) => {
    try {

        const url = new URL(request.url);
        const type = url.searchParams.get('type') || 'success'; // 'success' or 'failed'
        const limit = parseInt(url.searchParams.get('limit')) || 20;

        let query = `
            SELECT id, user_id, farm_id, image_url, disease_name_bn, disease_name_en, confidence_score, status, scan_result_json, created_at 
            FROM crop_scans 
        `;

        if (type === 'failed') {
            query += ` WHERE status = 'failed' OR status = 'not_a_crop' OR confidence_score < 60 `;
        } else {
            query += ` WHERE status != 'failed' AND confidence_score >= 60 `;
        }

        query += ` ORDER BY created_at DESC LIMIT ? `;

        const result = await env.DB.prepare(query).bind(limit).all();

        return Response.json({ success: true, scans: result.results || [] });
    } catch (e) {
        console.error("Admin Scan Fetch Error:", e.message);
        return Response.json({ success: false, error: 'Could not fetch logs' }, { status: 500 });
    }
};

export const updateDiagnosticRules = async (request, env) => {
    try {

        const body = await request.json();
        const ruleText = body.rules || '';

        // We can just update id = 1 or insert if not exists
        await env.DB.prepare("INSERT OR REPLACE INTO ai_doctor_rules (id, rule_text, priority, is_active) VALUES (1, ?, 1, 1)")
              .bind(ruleText).run();

        return Response.json({ success: true, message: 'Rules updated successfully' });
    } catch (e) {
        return Response.json({ success: false, error: 'Failed to update rules' }, { status: 500 });
    }
};

export const getDiagnosticRules = async (request, env) => {
    try {

        const row = await env.DB.prepare("SELECT rule_text FROM ai_doctor_rules WHERE id = 1").first();
        
        return Response.json({ success: true, rules: row?.rule_text || '' });
    } catch (e) {
        return Response.json({ success: false, error: 'Fetch failed' }, { status: 500 });
    }
};
