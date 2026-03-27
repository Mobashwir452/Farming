import { generateCropData } from '../../utils/ai_engine.js';

export const getMasterCrops = async (request, env) => {
    try {
        const { results } = await env.DB.prepare("SELECT id, crop_category, crop_name, variety_name FROM crops_master_data WHERE verified_status = 1 ORDER BY crop_name ASC").all();
        return Response.json({ success: true, crops: results || [] });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const postTestPrediction = async (request, env) => {
    try {
        const body = await request.json();
        const { cropDataId, landSize } = body;
        if (!cropDataId) return Response.json({ success: false, error: 'Crop ID missing' }, { status: 400 });
        
        const crop = await env.DB.prepare("SELECT * FROM crops_master_data WHERE id = ?").bind(cropDataId).first();
        if (!crop) return Response.json({ success: false, error: 'Crop details not found in master data' }, { status: 404 });
        
        let options = { isOffSeason: false, forceOffSeason: false };
        if (crop.govt_approved_data) options.govtContext = crop.govt_approved_data;
        
        const aiResponse = await generateCropData(
            env, 
            crop.crop_name, 
            crop.variety_name, 
            options
        );
        
        const sizeMultiplier = Math.max(1, parseInt(landSize) || 1);
        
        if (aiResponse && aiResponse.financial_resources) {
             aiResponse.financial_resources.forEach(r => {
                 r.estimated_cost_bdt = (r.estimated_cost_bdt * sizeMultiplier);
             });
        }
        
        return Response.json({ success: true, data: aiResponse });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const deleteCache = async (request, env) => {
    try {
        const cropId = request.params.cropId;
        await env.DB.prepare("DELETE FROM ai_timeline_cache WHERE crop_data_id = ?").bind(cropId).run();
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const getGlobalPrompt = async (request, env) => {
    try {
        let promptVal = '';
        try {
            const row = await env.DB.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'global_custom_instruction'").first();
            if (row) promptVal = row.setting_value;
        } catch (ignore) { /* error handled silently */ }
        return Response.json({ success: true, prompt: promptVal });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const setGlobalPrompt = async (request, env) => {
    try {
        const body = await request.json();
        const { prompt } = body;
        
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`).run();
        
        await env.DB.prepare(`INSERT INTO admin_settings (setting_key, setting_value, updated_at) 
                      VALUES ('global_custom_instruction', ?, CURRENT_TIMESTAMP)
                      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP`)
                      .bind(prompt || '').run();
                      
        return Response.json({ success: true });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
