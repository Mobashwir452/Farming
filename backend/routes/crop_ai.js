import { generateCropData } from '../utils/ai_engine.js';

const MONTH_MAP = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

const cleanVarietyName = (cropName, varietyName) => {
    let cleanVariety = (varietyName || '').trim();
    const cName = (cropName || '').trim();
    if (cName && cleanVariety.startsWith(cName)) {
        let tmp = cleanVariety.substring(cName.length).trim();
        if (tmp.startsWith('(') && tmp.endsWith(')')) {
            cleanVariety = tmp.substring(1, tmp.length - 1).trim();
        } else if (tmp) {
            cleanVariety = tmp;
        }
    }
    return cleanVariety;
};

export const suggestCrop = async (request, env) => {
    try {
        const url = new URL(request.url);
        const monthFilter = parseInt(url.searchParams.get('month')) || (new Date().getMonth() + 1);
        const monthName = MONTH_MAP[monthFilter];

        // Zero-Cost Suggestion Logic: Use SQL sorting inside D1!
        const query = `
            SELECT crop_name, variety_name, disease_resistance_score, base_yield_per_shotangsho_kg 
            FROM crops_master_data 
            WHERE planting_months LIKE ? 
            ORDER BY base_yield_per_shotangsho_kg DESC, disease_resistance_score DESC 
            LIMIT 3;
        `;

        const results = await env.DB.prepare(query).bind(`%${monthName}%`).all();

        const mappedCrops = (results.results || []).map(row => ({
            name: `${row.crop_name} (${row.variety_name})`,
            score: row.disease_resistance_score || 7
        }));

        return Response.json({ success: true, crops: mappedCrops });
    } catch (err) {
        console.error("AI Suggestion Edge Error:", err.message);
        return Response.json({ success: false, error: 'Cannot fetch suggestion' }, { status: 500 });
    }
};

export const predictCrop = async (request, env) => {
    try {
        const url = new URL(request.url);
        const farmId = url.searchParams.get('farm_id');
        const cropString = url.searchParams.get('crop_name');
        const varietyString = url.searchParams.get('variety_name');
        const forceOffSeason = url.searchParams.get('force_off_season') === 'true';
        const forceAi = url.searchParams.get('force_ai') === 'true';

        if (!farmId || !cropString) {
            return Response.json({ success: false, error: 'farm_id and crop_name are required' }, { status: 400 });
        }

        // Fetch farm area_shotangsho to calculate math
        const farm = await env.DB.prepare("SELECT area_shotangsho FROM farms WHERE id = ?").bind(farmId).first();
        if (!farm) {
            return Response.json({ success: false, error: 'Farm not found' }, { status: 404 });
        }

        const cacheKey = cropString.trim();

        // 1. RAG: Fetch Authoritative Govt Baseline & SEASON VALIDATION FIRST
        let govtContext = "";
        let isOffSeason = false;
        let isNewVarietySearch = false;
        let exclusionListStr = "[]";

        let targetCropName = cropString.trim();
        let targetVarietyName = varietyString ? varietyString.trim() : targetCropName;
        let targetDuration = 0;

        try {
            // First, check if exact match exists for the specific variety or crop
            let exactGovtData = null;
            if (!forceAi) {
                exactGovtData = await env.DB.prepare("SELECT * FROM crops_master_data WHERE variety_name = ? OR (crop_name = ? AND variety_name = ?) LIMIT 1").bind(targetVarietyName, targetCropName, targetVarietyName).first();
            }

            if (exactGovtData) {
                targetCropName = exactGovtData.crop_name;
                targetVarietyName = exactGovtData.variety_name;
                targetDuration = exactGovtData.avg_duration_days || 0;
                // Exact Match found! Process normal RAG & Season warning
                if (exactGovtData.planting_months) {
                    const currentMonthName = MONTH_MAP[new Date().getMonth() + 1];
                    if (!exactGovtData.planting_months.includes(currentMonthName)) {
                        isOffSeason = true;
                        if (!forceOffSeason) {
                            // Intercept and Warn! Zero AI Cost!
                            return Response.json({
                                success: false,
                                off_season_warning: true,
                                message: `এখন ${currentMonthName} মাস। কিন্তু "${targetVarietyName}" রোপণের সঠিক সময় হলো: ${exactGovtData.planting_months}। আপনি কি নিশ্চিত যে আপনি অসময়ে ফসলটি বুনতে চান? তাহলে ফলন কম হতে পারে।`
                            });
                        }
                    }
                }

                // Scale strictly to 1 Shotangsho for LLM context accuracy
                const yieldShotangsho = exactGovtData.base_yield_per_shotangsho_kg;
                govtContext = `[OFFICIAL GOVT DATA]: Base Yield per 1 Shotangsho: ${yieldShotangsho} KG, Duration: ${exactGovtData.avg_duration_days} days. Trait/Resistance: ${exactGovtData.disease_resistance}`;
            } else {
                // Exact match NOT found. This is a generic input, we need the AI to find a new specific variety.
                isNewVarietySearch = true;
                const existingVarieties = await env.DB.prepare("SELECT variety_name FROM crops_master_data WHERE crop_name LIKE ? OR variety_name LIKE ?").bind(`%${targetCropName}%`, `%${targetVarietyName}%`).all();
                const names = (existingVarieties.results || []).map(r => r.variety_name);
                exclusionListStr = JSON.stringify(names);
            }
        } catch (e) {
            console.error("Master table RAG error:", e);
        }

        // 2. CACHE-ASIDE: Check our D1 Timeline Cache Database!
        try {
            let cache = null;
            if (!forceAi) {
                cache = await env.DB.prepare("SELECT * FROM ai_timeline_cache WHERE crop_name = ? AND variety_name = ? AND expires_at > datetime('now')").bind(targetCropName, targetVarietyName).first();
            }

            if (cache) {
                // CACHE HIT! The AI already generated this timeline previously for someone else.
                const multiplier = farm.area_shotangsho; // AI generates per 1 Shotangsho 
                const yieldKg = cache.base_yield_kg ? (cache.base_yield_kg) * multiplier : 0;
                const costTaka = cache.base_cost_taka ? cache.base_cost_taka * multiplier : 0;
                const revenueTaka = cache.base_revenue_taka ? cache.base_revenue_taka * multiplier : 0;
                const profit = revenueTaka - costTaka;
                
                let resources = JSON.parse(cache.resources_json || '[]');
                
                const scaleStringAmount = (str, mMultiplier) => {
                    if (!str || str.trim() === '--' || str.trim() === '-') return str;
                    const match = str.trim().match(/^([০-৯0-9.]+)(.*)$/);
                    if (match) {
                        const toEng = (s) => s ? s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)) : '';
                        let num = parseFloat(toEng(match[1]));
                        let rest = match[2];
                        const scaledNumStr = (num * mMultiplier).toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
                        return scaledNumStr + rest;
                    }
                    return str;
                };

                const timelineCache = JSON.parse(cache.timeline_json || '{}');
                return Response.json({
                    success: true,
                    data: {
                        crop_name: cache.crop_name,
                        variety_name: cache.variety_name,
                        duration_days: targetDuration,
                        yield: { range: Math.round(cache.base_yield_kg * multiplier), condition: targetDuration ? `আনুমানিক সময়: ${targetDuration} দিন` : "আনুমানিক সময়: অনির্ধারিত", lifespan: '' },
                        finance: {
                            price_per_kg: cache.crop_market_price_bdt,
                            cost: `${Math.round(cache.base_cost_taka * multiplier)} টাকা`,
                            revenue: `${Math.round(cache.base_revenue_taka * multiplier)} টাকা`,
                            profit: (cache.base_revenue_taka - cache.base_cost_taka) * multiplier >= 0 ? `+ ${Math.round((cache.base_revenue_taka - cache.base_cost_taka) * multiplier)} টাকা` : `- ${Math.abs(Math.round((cache.base_revenue_taka - cache.base_cost_taka) * multiplier))} টাকা`
                        },
                        risks: JSON.parse(cache.risks_json || '[]').filter(r => r.type !== 'lifespan'),
                        resources: JSON.parse(cache.resources_json || '[]').map(r => ({ ...r, estimated_cost_bdt: r.estimated_cost_bdt * multiplier, amount: scaleStringAmount(r.amount, multiplier) })),
                        timeline: Array.isArray(timelineCache) ? timelineCache : (timelineCache.guideline || []),
                        daily_tasks: Array.isArray(timelineCache) ? timelineCache : (timelineCache.tasks || []),
                        cached: true // Tell the frontend it was blazing fast
                    }
                });
            }
        } catch (e) {
            console.error("Cache read error, fallback to generating:", e);
        }

        // 3. Prepare AI Prompt & Run Extraction natively via centralized Engine
        const aiData = await generateCropData(env, targetCropName, targetVarietyName, {
            isNewVarietySearch,
            govtContext,
            forceOffSeason,
            isOffSeason,
            exclusionListStr,
            featureType: 'public_prediction'
        });

        const {
            base_yield_kg,
            crop_market_price_bdt,
            financial_resources,
            base_cost_taka,
            base_revenue_taka,
            risks,
            project_lifespan,
            timeline,
            daily_tasks
        } = aiData;

        // 6. CACHING AND NEW MASTER TRACKING!
        const cropNameToSave = (isNewVarietySearch && aiData.actual_crop_name) ? aiData.actual_crop_name : (isNewVarietySearch ? cropString.trim() : targetCropName);
        let rawVarietyNameToSave = isNewVarietySearch ? aiData.variety_name : targetVarietyName;
        const varietyNameToSave = cleanVarietyName(cropNameToSave, rawVarietyNameToSave);

        // If AI found a completely new variety, store it into Master Table as Unverified!
        if (isNewVarietySearch && cropNameToSave !== varietyNameToSave) {
            await env.DB.prepare("INSERT OR IGNORE INTO crops_master_data (crop_category, crop_name, variety_name, base_yield_per_shotangsho_kg, avg_duration_days, verified_status) VALUES (?, ?, ?, ?, ?, 0)")
                .bind('Uncategorized', cropNameToSave, varietyNameToSave, 0, 0).run().catch(e => console.error("New Variety Tracking Error:", e.message));
        }

        // Save this generated timeline and tasks to D1 cache!
        const cacheData = { guideline: timeline, tasks: daily_tasks };
        await env.DB.prepare("INSERT OR REPLACE INTO ai_timeline_cache (crop_name, variety_name, base_yield_kg, base_cost_taka, base_revenue_taka, timeline_json, risks_json, resources_json, crop_market_price_bdt, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+6 months'))")
            .bind(cropNameToSave, varietyNameToSave, base_yield_kg, base_cost_taka, base_revenue_taka, JSON.stringify(cacheData), JSON.stringify(risks), JSON.stringify(financial_resources), crop_market_price_bdt)
            .run().catch(e => console.error("Cache saving error:", e.message));

        // 7. MULTIPLY BY FARMER SHOTANGSHO FRACTION (Dynamic Scaling)
        const m = farm.area_shotangsho; // AI data is now structured for exactly 1 shotangsho!
        const totalCost = base_cost_taka * m;
        const totalRev = base_revenue_taka * m;
        const profit = totalRev - totalCost;

        const scaleStringAmount = (str, mMultiplier) => {
            if (!str || str.trim() === '--' || str.trim() === '-') return str;
            const match = str.trim().match(/^([০-৯0-9.]+)(.*)$/);
            if (match) {
                const toEng = (s) => s ? s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)) : '';
                let num = parseFloat(toEng(match[1]));
                let rest = match[2];
                const scaledNumStr = (num * mMultiplier).toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
                return scaledNumStr + rest;
            }
            return str;
        };

        // Scale the resources nicely for the frontend preview
        const scaledResources = financial_resources.map(r => ({ ...r, estimated_cost_bdt: r.estimated_cost_bdt * m, amount: scaleStringAmount(r.amount, m) }));

        // Remove lifespan from risks for the frontend
        const frontendRisks = risks.filter(r => r.type !== 'lifespan');

        const responseObj = {
            crop_name: cropNameToSave,
            variety_name: varietyNameToSave,
            duration_days: targetDuration,
            yield: { range: Math.round(base_yield_kg * m), condition: targetDuration ? `আনুমানিক সময়: ${targetDuration} দিন` : "আনুমানিক সময়: অনির্ধারিত", lifespan: project_lifespan },
            finance: {
                price_per_kg: crop_market_price_bdt,
                cost: `${Math.round(totalCost)} টাকা`,
                revenue: `${Math.round(totalRev)} টাকা`,
                profit: profit >= 0 ? `+ ${Math.round(profit)} টাকা` : `- ${Math.abs(Math.round(profit))} টাকা`
            },
            risks: frontendRisks,
            resources: scaledResources,
            timeline: timeline,
            daily_tasks: daily_tasks,
            cached: false
        };

        return Response.json({ success: true, data: responseObj });

    } catch (error) {
        console.error("AI Prediction Edge Error:", error.message);
        return Response.json({ success: false, error: 'এনালাইসিসে একটি ত্রুটি হয়েছে: ' + error.message }, { status: 500 });
    }
};
