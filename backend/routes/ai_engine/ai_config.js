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
        if (statements.length > 0) {
            await env.DB.batch(statements);
        }
        
        return Response.json({ success: true, message: 'API Keys updated successfully!' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
