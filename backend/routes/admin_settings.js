export const getAdminSettings = async (request, env) => {
    try {
        const { results } = await env.DB.prepare("SELECT key_name, key_value FROM admin_settings").all();
        const settings = {};
        for(const r of results) {
            settings[r.key_name] = r.key_value;
        }
        return Response.json({ success: true, settings });
    } catch(err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}

export const saveAdminSettings = async (request, env) => {
    try {
        const body = await request.json();
        
        const updates = [];
        for (const [k, v] of Object.entries(body)) {
            const exists = await env.DB.prepare("SELECT key_name FROM admin_settings WHERE key_name = ?").bind(k).first();
            if (exists) {
                updates.push(env.DB.prepare("UPDATE admin_settings SET key_value = ? WHERE key_name = ?").bind(v, k));
            } else {
                updates.push(env.DB.prepare("INSERT INTO admin_settings (key_name, key_value) VALUES (?, ?)").bind(k, v));
            }
        }
        
        if (updates.length > 0) {
            await env.DB.batch(updates);
        }
        
        return Response.json({ success: true, message: 'Settings saved successfully' });
    } catch(err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}
