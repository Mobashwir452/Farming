import { error, json } from 'itty-router';
import { generateCropData } from '../utils/ai_engine.js';
const MONTH_MAP = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

export const getAdminCache = async (request, env) => {
    try {
        const url = new URL(request.url);
        const cropKey = url.searchParams.get('crop');
        const varietyKey = url.searchParams.get('variety');

        if (!cropKey || !varietyKey) return error(400, "Crop and Variety parameters are both required");

        // 1. Exact Match
        let cache = await env.DB.prepare("SELECT * FROM ai_timeline_cache WHERE crop_name = ? AND variety_name = ?")
            .bind(cropKey, varietyKey).first();

        // 2. Fallback: Like match in DB (e.g., DB has 'পেঁপে (টপ লেডি)' but request is 'টপ লেডি')
        if (!cache) {
            cache = await env.DB.prepare("SELECT * FROM ai_timeline_cache WHERE crop_name = ? AND variety_name LIKE ? ORDER BY expires_at DESC LIMIT 1")
                .bind(cropKey, `%${varietyKey}%`).first();
        }

        // 3. Fallback: Request has 'পেঁপে (টপ লেডি)' but DB has 'টপ লেডি'
        if (!cache && varietyKey.includes(cropKey)) {
             const cleanVariety = varietyKey.replace(cropKey, '').replace(/[()]/g, '').trim();
             if (cleanVariety.length > 2) {
                 cache = await env.DB.prepare("SELECT * FROM ai_timeline_cache WHERE crop_name = ? AND variety_name LIKE ? ORDER BY expires_at DESC LIMIT 1")
                     .bind(cropKey, `%${cleanVariety}%`).first();
             }
        }

        return json({ success: true, cache });
    } catch (e) {
        return error(500, e.message);
    }
};

export const saveAdminCache = async (request, env) => {
    try {
        const data = await request.json();

        // Ensure no expiry for manual admin saves! (9999-12-31)
        await env.DB.prepare(`
            INSERT OR REPLACE INTO ai_timeline_cache 
            (crop_name, variety_name, base_yield_kg, base_cost_taka, base_revenue_taka, timeline_json, risks_json, resources_json, crop_market_price_bdt, expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
            .bind(
                data.crop_name, data.variety_name, data.base_yield_kg,
                data.base_cost_taka, data.base_revenue_taka,
                data.timeline_json, data.risks_json, data.resources_json || '[]', data.crop_market_price_bdt || 0, '9999-12-31 23:59:59'
            ).run();

        return json({ success: true, message: "Cache saved/updated successfully" });
    } catch (e) {
        return error(500, e.message);
    }
};

export const deleteAdminCache = async (request, env) => {
    try {
        const url = new URL(request.url);
        const cropKey = url.searchParams.get('crop');
        const varietyKey = url.searchParams.get('variety');
        if (!cropKey || !varietyKey) return error(400, "Crop and Variety parameters required");

        await env.DB.prepare("DELETE FROM ai_timeline_cache WHERE crop_name = ? AND variety_name = ?")
            .bind(cropKey, varietyKey).run();

        return json({ success: true, message: "Cache deleted" });
    } catch (e) {
        return error(500, e.message);
    }
};

export const generateAdminCacheAI = async (request, env) => {
    try {
        const body = await request.json();
        const cacheKey = body.crop_string; // e.g. "বোরো ধান (ব্রি ধান ২৮)"
        if (!cacheKey) return error(400, 'crop_string missing');

        // Extract raw core names exactly as they are in the DB to sync with Public API
        const cropName = body.crop_name || cacheKey;
        const varietyName = (body.variety_name && body.variety_name.trim() !== "") ? body.variety_name : cropName;

        let govtContext = "";
        try {
            const govtData = await env.DB.prepare("SELECT * FROM crops_master_data WHERE variety_name LIKE ? OR crop_name LIKE ? ORDER BY base_yield_per_shotangsho_kg DESC LIMIT 1")
                .bind(`%${cacheKey}%`, `%${cacheKey}%`).first();

            if (govtData) {
                const yieldShotangsho = govtData.base_yield_per_shotangsho_kg;
                govtContext = `[OFFICIAL GOVT DATA]: Base Yield per 1 Shotangsho: ${yieldShotangsho} KG, Duration: ${govtData.avg_duration_days} days. Trait/Resistance: ${govtData.disease_resistance}`;
            }
        } catch (e) {
            console.error("Master table RAG error:", e);
        }

        let exclusionListStr = "[]";
        if (body.is_new_discovery) {
            try {
                const existingVarieties = await env.DB.prepare("SELECT variety_name FROM crops_master_data WHERE crop_name LIKE ? OR variety_name LIKE ?").bind(`%${cropName}%`, `%${varietyName}%`).all();
                const names = (existingVarieties.results || []).map(r => r.variety_name);
                exclusionListStr = JSON.stringify(names);
            } catch (e) { console.error("Exclusion list error:", e); }
        }

        const aiData = await generateCropData(env, cropName, varietyName, {
            govtContext,
            featureType: 'admin_cache',
            isNewVarietySearch: !!body.is_new_discovery,
            exclusionListStr
        });

        const {
            base_yield_kg,
            crop_market_price_bdt,
            financial_resources,
            base_cost_taka,
            base_revenue_taka,
            risks,
            timeline,
            daily_tasks,
            actual_crop_name,
            variety_name: ai_variety_name
        } = aiData;

        // Extract raw core names exactly as they are in the DB to sync with Public API
        const finalCropName = actual_crop_name || cropName;
        const finalVarietyName = ai_variety_name || varietyName;

        const cacheData = { guideline: timeline, tasks: daily_tasks };

        // Set expiry dynamically (6 months for AI generated)
        await env.DB.prepare("INSERT OR REPLACE INTO ai_timeline_cache (crop_name, variety_name, base_yield_kg, base_cost_taka, base_revenue_taka, timeline_json, risks_json, resources_json, crop_market_price_bdt, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+6 months'))")
            .bind(finalCropName, finalVarietyName, base_yield_kg, base_cost_taka, base_revenue_taka, JSON.stringify(cacheData), JSON.stringify(risks), JSON.stringify(financial_resources), crop_market_price_bdt)
            .run();

        // Admin quick AI generate feature - insert into Pending AI!
        if (body.is_new_discovery) {
            const existing = await env.DB.prepare("SELECT id FROM crops_master_data WHERE crop_name = ? AND variety_name = ?").bind(finalCropName, finalVarietyName).first();
            if (!existing) {
                await env.DB.prepare("INSERT INTO crops_master_data (crop_category, crop_name, variety_name, base_yield_per_shotangsho_kg, avg_duration_days, verified_status) VALUES (?, ?, ?, ?, ?, 0)")
                    .bind('Uncategorized', finalCropName, finalVarietyName, 0, 0).run().catch(e => { console.error("Admin AI quick add error:", e); });
            }
        }

        return json({ success: true, message: 'AI Generated and Cached' });

    } catch (error) {
        console.error("AI Generation Admin Error:", error.message);
        return json({ success: false, error: 'এনালাইসিসে একটি ত্রুটি হয়েছে: ' + error.message }, { status: 500 });
    }
}
