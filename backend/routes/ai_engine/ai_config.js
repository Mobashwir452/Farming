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
        const incomingKeys = body.keys || []; // Array of strings e.g. ["key1", "key2"]

        // 1. Fetch currently stored keys
        const { results: currentDbKeys } = await env.DB.prepare("SELECT api_key FROM ai_api_keys").all();
        const currentKeyStrings = currentDbKeys.map(k => k.api_key);

        // 2. Identify which keys to delete (removed from UI)
        const keysToDelete = currentKeyStrings.filter(k => !incomingKeys.includes(k));

        // 3. Identify which keys to insert (brand new in UI)
        const keysToInsert = incomingKeys.filter(k => !currentKeyStrings.includes(k));

        const statements = [];

        // Prepare DELETE statement
        if (keysToDelete.length > 0) {
            const placeholders = keysToDelete.map(() => '?').join(',');
            statements.push(env.DB.prepare(`DELETE FROM ai_api_keys WHERE api_key IN (${placeholders})`).bind(...keysToDelete));
        }

        // Prepare INSERT statements
        for (const newKey of keysToInsert) {
            // new keys are always inserted as active
            statements.push(env.DB.prepare(`INSERT INTO ai_api_keys (api_key, status) VALUES (?, 'active')`).bind(newKey));
        }

        // Execute cleanly in a single batch
        // Execute array of statements
        if (statements.length > 0) {
            await env.DB.batch(statements);
        }

        // 4. Update core config settings (id=1)
        const sysPrompt = body.system_prompt || '';
        const fallback = body.fallback_message || '';
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

        return Response.json({ success: true, message: 'API Keys updated successfully!' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
