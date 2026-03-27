export const getAiConfig = async (request, env) => {
    try {
        const { results: keys } = await env.DB.prepare("SELECT * FROM ai_api_keys ORDER BY id").all();
        const configRow = await env.DB.prepare("SELECT * FROM ai_config WHERE id = 1").first();

        return Response.json({
            success: true,
            keys: keys || [],
            config: configRow || { emergency_stop: 0 }
        });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const saveAiConfig = async (request, env) => {
    try {
        const body = await request.json();

        // 4. Update core config settings (id=1)
        const sysPrompt = body.system_prompt || '';
        const fallback = body.fallback_message || '';
        // Fix for toggle mapping securely:
        const emStop = body.emergency_stop === 1 ? 1 : 0;

        // This query updates or inserts if id=1 doesn't exist
        await env.DB.prepare(`
            INSERT INTO ai_config (id, system_prompt, fallback_message, emergency_stop, updated_at) 
            VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET 
                system_prompt=excluded.system_prompt, 
                fallback_message=excluded.fallback_message, 
                emergency_stop=excluded.emergency_stop,
                updated_at=CURRENT_TIMESTAMP
        `).bind(sysPrompt, fallback, emStop).run();

        // If emergency is triggered, update all active API keys to 'disabled'
        if (emStop === 1) {
            await env.DB.prepare(`UPDATE ai_api_keys SET status = 'disabled' WHERE status = 'active'`).run();
        } else {
            // Revert all disabled keys back to active when emergency stops
            await env.DB.prepare(`UPDATE ai_api_keys SET status = 'active' WHERE status = 'disabled'`).run();
        }

        return Response.json({ success: true, message: 'Configuration updated successfully!' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
export const getAiPrompts = async (request, env) => {
    try {
        const { results: prompts } = await env.DB.prepare("SELECT * FROM ai_prompt_templates ORDER BY id").all();
        return Response.json({ success: true, prompts: prompts || [] });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const saveAiPrompt = async (request, env) => {
    try {
        const body = await request.json();
        const { prompt_key, system_role, template_body, fallback_message } = body;

        if (!prompt_key || !template_body) {
            return Response.json({ success: false, error: "Prompt Details Missing" }, { status: 400 });
        }

        await env.DB.prepare(`
            INSERT INTO ai_prompt_templates (prompt_key, system_role, template_body, fallback_message, updated_at) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(prompt_key) DO UPDATE SET 
                system_role=excluded.system_role, 
                template_body=excluded.template_body, 
                fallback_message=excluded.fallback_message,
                updated_at=CURRENT_TIMESTAMP
        `).bind(prompt_key, system_role || '', template_body, fallback_message || '').run();

        return Response.json({ success: true, message: 'Prompt updated successfully!' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
