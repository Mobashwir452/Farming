export const getDoctorRules = async (request, env) => {
    try {
        const { results } = await env.DB.prepare("SELECT * FROM ai_doctor_rules ORDER BY priority ASC, id DESC").all();
        return Response.json({ success: true, rules: results || [] });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const saveDoctorRules = async (request, env) => {
    try {
        const body = await request.json();
        const { id, rule_text, priority, is_active } = body;
        
        if (id) {
            await env.DB.prepare("UPDATE ai_doctor_rules SET rule_text=?, priority=?, is_active=? WHERE id=?")
                .bind(rule_text, priority || 1, is_active === false ? 0 : 1, id).run();
        } else {
            await env.DB.prepare("INSERT INTO ai_doctor_rules (rule_text, priority, is_active) VALUES (?, ?, ?)")
                .bind(rule_text, priority || 1, is_active === false ? 0 : 1).run();
        }
        
        return Response.json({ success: true, message: 'Doctor rule saved successfully' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
