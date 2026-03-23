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
            const exactGovtData = await env.DB.prepare("SELECT * FROM crops_master_data WHERE variety_name = ? OR (crop_name = ? AND variety_name = ?) LIMIT 1").bind(targetVarietyName, targetCropName, targetCropName).first();

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
            const cache = await env.DB.prepare("SELECT * FROM ai_timeline_cache WHERE crop_name = ? AND variety_name = ? AND expires_at > datetime('now')").bind(targetCropName, targetVarietyName).first();

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

        // 3. Prepare AI Prompt (Strictly request exactly 1 SHOTANGSHO baseline numeric data & XML tags)
        let promptText = `
Act as an expert Agronomist in Bangladesh.
`;

        if (isNewVarietySearch) {
            promptText += `The user requested to grow crop: "${targetCropName}" and gave variety: "${targetVarietyName}". Your FIRST JOB is to identify the single BEST, highest-yielding, disease-resistant specific variety (জাত) for this crop in Bangladesh. Provide data for EXACTLY 1 SHOTANGSHO (১ শতাংশ) of land for this chosen variety.
Output the chosen specific variety name strictly inside <variety_name> Tags (e.g. <variety_name>তরমুজ (বিগ বস)</variety_name>).
CRITICAL RULE: DO NOT SUGGEST ANY OF THESE FOLLOWING VARIETIES BECAUSE THEY ALREADY EXIST IN OUR DATABASE: ${exclusionListStr}. Find a completely NEW and profitable variety!
`;
        } else {
            promptText += `Provide data for EXACTLY 1 SHOTANGSHO (১ শতাংশ) of land specifically for the Crop: "${targetCropName}" and Variety: "${targetVarietyName}".\n`;
            promptText += `<variety_name>${targetVarietyName}</variety_name>\n`; // self-fulfill to keep parsing simple
            if (govtContext) promptText += `Use this official Government Database context strictly to govern your output: ${govtContext}\n`;
        }

        promptText += `
[CRITICAL NEW INSTRUCTION for PLANTING METHOD]: YOU MUST decide the ONLY BEST, absolute optimal planting method for this specific variety (whether it is direct seeds, ready saplings from a nursery, or tubers/cuttings).
Within the VERY FIRST <step> in the <timeline> (day_offset 0), you MUST mention specifically that "এই জাতের জন্য [method] রোপণ করলে সবচেয়ে ভালো হবে" in the description.
Do NOT wait for user input on this. Provide the optimal financial estimate for "বীজ বা চারা" based precisely on this optimal chosen method.
`;

        if (isOffSeason && forceOffSeason) {
            promptText += `\n[CRITICAL WARNING]: The farmer is planting this OFF-SEASON (currently ${MONTH_MAP[new Date().getMonth() + 1]}). You MUST reduce the yield output drastically compared to normal, explicitly mention the weather risks in the <risks> section, and adjust the timeline for adverse conditions!\n`;
        }

        promptText += `
[CRITICAL CONSISTENCY & MATH RULES]:
1. The exact fertilizers, pesticides, seeds, quantities, and their costs listed in your <financial_resources> block MUST 100% IDENTICALLY MATCH the actions and amounts you describe in your <timeline> block. You must NOT introduce any fertilizer or pesticide in the timeline that is missing from the resource list, and the quantities must match identically. Both blocks must be generated strictly representing exactly 1 Shotangsho (১ শতাংশ).
2. For Pesticides/Fungicides, the <amount> and <estimated_cost_bdt> must reflect the TOTAL requirement across the ENTIRE crop lifespan (Amount per dose × Number of total doses needed for 1 shotangsho).

[CRITICAL TIMELINE & TASKS RULES - MUST FOLLOW STRICTLY]:
1. TWO SEPARATE OUTPUTS: You MUST provide a short <timeline> (5-7 grouped steps for a high-level guideline) AND a separate <daily_tasks> array (a highly granular, fully unrolled daily to-do list for the farmer). 
2. EXACT CALCULATION: NEVER use vague phrases like "ফুল আসার পর" or "রোগ দেখা দিলে" in the <day_offset>. You MUST calculate the exact biological day these events naturally occur for this specific variety and output a strict numerical <day_offset> (e.g., if flowering is at day 45, output <day_offset>45</day_offset>).
3. PRE-PLANTING NEGATIVE OFFSETS: All land preparation, bed making, basal dose application, and seed treatments MUST have a NEGATIVE <day_offset> (e.g., -7, -3). The actual planting/sowing day MUST be EXACTLY <day_offset>0</day_offset>.
4. UNROLL RECURRING TASKS: Inside <daily_tasks>, DO NOT group repeated actions. If a pesticide needs to be sprayed every 15 days, you MUST generate completely separate <task> tags for Day 15, Day 30, Day 45, etc., until harvest. 

Output your response STRICTLY using ONLY the following XML tags translated to Bengali. Do not write any markdown code blocks, do not write any intro/outro text, just output the raw XML tags. Do NOT use JSON structures.`;

        promptText += `
<base_yield_kg>Write exactly digits only, e.g. 24</base_yield_kg>
<crop_market_price_bdt_per_kg>Write exactly digits only for 1 kg, e.g. 40</crop_market_price_bdt_per_kg>

<risks>
  <risk>
    <type>warning</type>
    <message>Short Bengali warning here</message>
  </risk>
</risks>

<project_lifespan>For short-term crops, state total days from seed to final harvest (e.g. 'বীজতলা থেকে সম্পূর্ণ হার্ভেস্ট শেষ হতে মোট ১২০ দিন লাগবে।'). For perennial trees (e.g. Papaya), explicitly state 'গাছের মোট আয়ুষ্কাল ৩-৪ বছর এবং রোপণের ৬ মাস পর থেকে একটানা ২.৫ বছর ফলন দিবে।'</project_lifespan>

<financial_resources>
  <resource>
    <category>seed_or_sapling</category>
    <name>[পদ্ধতি অনুযায়ী নির্দিষ্ট নাম, উদা: টমেটোর চারা/আলুর কন্দ]</name>
    <amount>0.5 kg</amount>
    <estimated_cost_bdt>150</estimated_cost_bdt>
  </resource>
  <resource>
    <category>fertilizer</category>
    <name>ইউরিয়া সার</name>
    <amount>1 kg</amount>
    <estimated_cost_bdt>25</estimated_cost_bdt>
  </resource>
  <resource>
    <category>labor_and_other</category>
    <name>জমি তৈরি ও চাষের খরচ</name>
    <amount>--</amount>
    <estimated_cost_bdt>100</estimated_cost_bdt>
  </resource>
</financial_resources>

<timeline>
  <step>
    <day_offset>-7</day_offset>
    <title>১. জমি ও মাদা প্রস্তুতকরণ</title>
    <desc>কয়টি চাষ/মই দিতে হবে এবং মূল জমিতে কী কী প্রান্তিক/বেসাল সার দিতে হবে তার বিস্তারিত।</desc>
  </step>
  <step>
    <day_offset>0</day_offset>
    <title>২. বপন বা রোপণ</title>
    <desc>রোপণের সঠিক পদ্ধতি ও দূরত্ব।</desc>
  </step>
  <step>
    <day_offset>20</day_offset>
    <title>৩. বৃদ্ধি পর্যায় (Growth Stage)</title>
    <desc>প্রথম উপরি সার এবং নিয়মিত সেচ ও বালাইনাশকের ওভারভিউ।</desc>
  </step>
</timeline>

<daily_tasks>
  <task>
    <day_offset>-7</day_offset>
    <title>জমি প্রস্তুত ও প্রথম সার</title>
    <desc>জমিতে চাষ দিয়ে টিএসপি ও পটাশ সার প্রয়োগ করুন।</desc>
  </task>
  <task>
    <day_offset>0</day_offset>
    <title>বীজ/চারা রোপণ</title>
    <desc>সঠিক দূরত্ব বজায় রেখে রোপণ করুন এবং হালকা সেচ দিন।</desc>
  </task>
  <task>
    <day_offset>15</day_offset>
    <title>১ম প্রতিরোধক স্প্রে</title>
    <desc>পোকামাকড় দমনে ১ম স্প্রে করুন।</desc>
  </task>
  <task>
    <day_offset>30</day_offset>
    <title>২য় প্রতিরোধক স্প্রে</title>
    <desc>পোকামাকড় দমনে ২য় স্প্রে করুন।</desc>
  </task>
</daily_tasks>
`;

        // 4. API Key Rotation System
        await env.DB.prepare("UPDATE ai_api_keys SET status = 'active', reset_date = NULL WHERE status = 'exhausted' AND reset_date <= datetime('now', '-24 hours')").run();
        const keysRes = await env.DB.prepare("SELECT id, api_key FROM ai_api_keys WHERE status = 'active'").all();
        let availableKeys = keysRes.results || [];

        if (availableKeys.length === 0) {
            return Response.json({ success: false, error: 'এআই কোটা শেষ। দয়া করে আগামীকাল চেষ্টা করুন।' }, { status: 500 });
        }

        let aiRawText = null;
        let successKeyId = null;
        let lastErrorMsg = null;

        while (availableKeys.length > 0) {
            const index = Math.floor(Math.random() * availableKeys.length);
            const keyObj = availableKeys[index];

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${keyObj.api_key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 8192
                            // Deliberately empty: NO responseSchema, NO responseMimeType to prevent hallucination looping
                        }
                    })
                });

                const data = await response.json();

                if (data.error) {
                    const errMsg = data.error.message.toLowerCase();
                    if (response.status === 429 || errMsg.includes('quota') || errMsg.includes('exhausted')) {
                        await env.DB.prepare("UPDATE ai_api_keys SET status = 'exhausted', reset_date = CURRENT_TIMESTAMP WHERE id = ?").bind(keyObj.id).run();
                        availableKeys.splice(index, 1);
                        lastErrorMsg = data.error.message;
                        continue;
                    } else {
                        throw new Error(data.error.message);
                    }
                }

                aiRawText = data.candidates[0].content.parts[0].text;
                successKeyId = keyObj.id;
                break;
            } catch (err) {
                lastErrorMsg = err.message;
                availableKeys.splice(index, 1);
            }
        }

        if (!aiRawText) {
            return Response.json({ success: false, error: 'No working API keys remaining today. Error: ' + lastErrorMsg }, { status: 500 });
        }

        // Database Tracking Update (Must await so worker doesn't kill it)
        await env.DB.prepare("UPDATE ai_api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?").bind(successKeyId).run().catch(() => { });

        // 5. REGEX EXTRACTION (Bomb-proof Parsing)
        const toEngNum = (str) => str ? str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)) : '';
        const extractNum = (tag) => {
            const match = aiRawText.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'si'));
            if (!match) return 0;
            return parseFloat(toEngNum(match[1]).replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
        };

        const extractedVariety = aiRawText.match(/<variety_name>(.*?)<\/variety_name>/i);
        const finalVarietyName = (extractedVariety && extractedVariety[1]) ? extractedVariety[1].replace(/<[^>]*>?/gm, '').trim() : targetVarietyName;

        const base_yield_kg = extractNum('base_yield_kg');
        const crop_market_price_bdt = extractNum('crop_market_price_bdt_per_kg') || 30; // fallback

        let financial_resources = [];
        let base_cost_taka = 0;
        const resourcesBlock = aiRawText.match(/<financial_resources>([\s\S]*?)(?:<\/financial_resources>|$)/i);
        if (resourcesBlock) {
            const resMatches = [...resourcesBlock[1].matchAll(/<resource>([\s\S]*?)<\/resource>/gi)];
            financial_resources = resMatches.map((m) => {
                const block = m[1];
                const catMatch = block.match(/<category>([\s\S]*?)<\/category>/i);
                const nameMatch = block.match(/<name>([\s\S]*?)<\/name>/i);
                const amountMatch = block.match(/<amount>([\s\S]*?)<\/amount>/i);
                const costMatch = block.match(/<estimated_cost_bdt>([\s\S]*?)<\/estimated_cost_bdt>/i);
                const cost = costMatch ? parseFloat(toEngNum(costMatch[1]).replace(/[^\d\.]/g, '')) || 0 : 0;
                base_cost_taka += cost;
                return {
                    category: catMatch ? catMatch[1].replace(/<[^>]*>?/gm, '').trim() : 'labor_and_other',
                    name: nameMatch ? nameMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
                    amount: amountMatch ? amountMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
                    estimated_cost_bdt: cost
                };
            });
        }
        
        const base_revenue_taka = base_yield_kg * crop_market_price_bdt;

        let risks = [];
        const risksBlock = aiRawText.match(/<risks>([\s\S]*?)(?:<\/risks>|$)/i);
        if (risksBlock) {
            const riskMatches = [...risksBlock[1].matchAll(/<risk>[\s\S]*?<type>(.*?)<\/type>[\s\S]*?<message>(.*?)<\/message>[\s\S]*?(?:<\/risk>|$)/gi)];
            risks = riskMatches.map(m => ({ type: m[1].trim(), message: m[2].replace(/<[^>]*>?/gm, '').trim() }));
        }

        const lifespanMatch = aiRawText.match(/<project_lifespan>([\s\S]*?)<\/project_lifespan>/i);
        const project_lifespan = lifespanMatch ? lifespanMatch[1].replace(/<[^>]*>?/gm, '').trim() : '';
        if (project_lifespan) {
            risks.unshift({ type: "lifespan", message: project_lifespan });
        }

        let timeline = [];
        const timelineBlock = aiRawText.match(/<timeline>([\s\S]*?)(?:<\/timeline>|$)/i);
        if (timelineBlock) {
            const stepMatches = [...timelineBlock[1].matchAll(/<step>([\s\S]*?)<\/step>/gi)];
            timeline = stepMatches.map((m, idx) => {
                const block = m[1];
                const dayMatch = block.match(/<day_offset>([\s\S]*?)<\/day_offset>/i);
                const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
                const descMatch = block.match(/<desc>([\s\S]*?)<\/desc>/i);
                return {
                    step_number: idx + 1,
                    day_offset: dayMatch ? parseInt(dayMatch[1].replace(/[^\d-]/g, '')) || 0 : 0,
                    title: titleMatch ? titleMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
                    description: descMatch ? descMatch[1].replace(/<[^>]*>?/gm, '').trim() : ''
                };
            });
        }

        let daily_tasks = [];
        const tasksBlock = aiRawText.match(/<daily_tasks>([\s\S]*?)(?:<\/daily_tasks>|$)/i);
        if (tasksBlock) {
            const taskMatches = [...tasksBlock[1].matchAll(/<task>([\s\S]*?)<\/task>/gi)];
            daily_tasks = taskMatches.map((m) => {
                const block = m[1];
                const dayMatch = block.match(/<day_offset>([\s\S]*?)<\/day_offset>/i);
                const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
                const descMatch = block.match(/<desc>([\s\S]*?)<\/desc>/i);
                return {
                    day_offset: dayMatch ? parseInt(dayMatch[1].replace(/[^\d-]/g, '')) || 0 : 0,
                    title: titleMatch ? titleMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
                    description: descMatch ? descMatch[1].replace(/<[^>]*>?/gm, '').trim() : ''
                };
            });
        }

        // 6. CACHING AND NEW MASTER TRACKING!
        const cropNameToSave = isNewVarietySearch ? cropString.trim() : targetCropName;
        let rawVarietyNameToSave = isNewVarietySearch ? finalVarietyName : targetVarietyName;
        const varietyNameToSave = cleanVarietyName(cropNameToSave, rawVarietyNameToSave);

        // If AI found a completely new variety, store it into Master Table as Unverified!
        if (isNewVarietySearch && varietyNameToSave !== targetVarietyName) {
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
