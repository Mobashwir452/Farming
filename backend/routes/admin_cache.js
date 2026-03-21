import { error, json } from 'itty-router';

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

        const cache = await env.DB.prepare("SELECT * FROM ai_timeline_cache WHERE crop_name = ? AND variety_name = ?")
            .bind(cropKey, varietyKey).first();

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

        let promptText = `
Act as an expert Agronomist in Bangladesh. Provide data for EXACTLY 1 SHOTANGSHO (১ শতাংশ) of land specifically for the Crop: "${cropName}" and Variety: "${varietyName}".\n`;
        promptText += `<variety_name>${varietyName}</variety_name>\n`;

        promptText += `
[CRITICAL NEW INSTRUCTION for PLANTING METHOD]: YOU MUST decide the ONLY BEST, absolute optimal planting method for this specific variety (whether it is direct seeds, ready saplings from a nursery, or tubers/cuttings).
Within the VERY FIRST <step> in the <timeline> (day_offset 0), you MUST mention specifically that "এই জাতের জন্য [method] রোপণ করলে সবচেয়ে ভালো হবে" in the description.
Do NOT wait for user input on this. Provide the optimal financial estimate for "বীজ বা চারা" based precisely on this optimal chosen method.
`;

        if (govtContext) promptText += `Use this official Government Database context strictly to govern your output: ${govtContext}\n`;

        promptText += `
[CRITICAL CONSISTENCY & MATH RULES]:
1. The exact fertilizers, pesticides, seeds, quantities, and their costs listed in your <financial_resources> block MUST 100% IDENTICALLY MATCH the actions and amounts you describe in your <timeline> block. You must NOT introduce any fertilizer or pesticide in the timeline that is missing from the resource list, and the quantities must match identically. Both blocks must be generated strictly representing exactly 1 Shotangsho (১ শতাংশ).
2. For Pesticides/Fungicides, the <amount> and <estimated_cost_bdt> must reflect the TOTAL requirement across the ENTIRE crop lifespan (Amount per dose × Number of total doses needed for 1 shotangsho).

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
  <!-- List EVERY SINGLE fertilizer needed as a SEPARATE resource -->
  <resource>
    <category>fertilizer</category>
    <name>ইউরিয়া সার</name>
    <amount>1 kg</amount>
    <estimated_cost_bdt>25</estimated_cost_bdt>
  </resource>
  <resource>
    <category>fertilizer</category>
    <name>টিএসপি সার</name>
    <amount>500 গ্রাম</amount>
    <estimated_cost_bdt>20</estimated_cost_bdt>
  </resource>
  <!-- List EVERY SINGLE pesticide needed as a SEPARATE resource -->
  <resource>
    <category>pesticide</category>
    <name>কীটনাশক (উদা: ইমিডাক্লোপ্রিড)</name>
    <amount>5 ml</amount>
    <estimated_cost_bdt>40</estimated_cost_bdt>
  </resource>
  <!-- List ALL labor and processing costs. Do NOT group them into one resource! Breakdown into AT LEAST the following 3, or more if needed -->
  <resource>
    <category>labor_and_other</category>
    <name>জমি তৈরি ও চাষের খরচ</name>
    <amount>--</amount>
    <estimated_cost_bdt>100</estimated_cost_bdt>
  </resource>
  <resource>
    <category>labor_and_other</category>
    <name>শ্রমিক খরচ (রোপণ, নিড়ানি ও হার্ভেস্ট)</name>
    <amount>--</amount>
    <estimated_cost_bdt>400</estimated_cost_bdt>
  </resource>
  <resource>
    <category>labor_and_other</category>
    <name>সেচ ও আনুষঙ্গিক খরচ</name>
    <amount>--</amount>
    <estimated_cost_bdt>150</estimated_cost_bdt>
  </resource>
</financial_resources>

<timeline>
  <step>
    <day_offset>0</day_offset>
    <title>১. বীজ বা চারার পরিমাণ ও শোধন</title>
    <desc>১ শতাংশ জমির জন্য কতটুকু বীজ/চারা লাগবে। সরাসরি বীজ এবং চারা রোপণ- উভয় পদ্ধতির নিয়ম। বীজ শোধনের জন্য কোন ঔষধ পরিমিত পানিতে কতক্ষণ ভেজাতে হবে।</desc>
  </step>
  <step>
    <day_offset>5</day_offset>
    <title>২. জমি প্রস্তুতকরণ</title>
    <desc>কয়টি চাষ/মই দিতে হবে। বেড/মাদার মাপ (ফিট হিসেবে) এবং বীজ বা চারার দূরত্ব (ফিট হিসেবে)।</desc>
  </step>
  <step>
    <day_offset>10</day_offset>
    <title>৩. প্রাথমিক সার প্রয়োগ</title>
    <desc>১ শতাংশ বা ১টি মাদার জন্য কি কি সার কতটুকু দিতে হবে, মাটি ওলটপালট করে সারের গ্যাস বের করতে কতদিন ফেলে রাখতে হবে।</desc>
  </step>
  <step>
    <day_offset>15</day_offset>
    <title>৪. বপন বা রোপণ</title>
    <desc>সঠিক সময় এবং রোপণের সঠিক গভীরতা।</desc>
  </step>
  <step>
    <day_offset>30</day_offset>
    <title>৫. সেচ ও আন্তঃপরিচর্যা</title>
    <desc>প্রথম সেচ ও নিয়মিত সেচের রুটিন, মালচিং, আগাছা দমন, মাচা বা খুঁটি দেওয়া।</desc>
  </step>
  <step>
    <day_offset>45</day_offset>
    <title>৬. উপরি সার ও ঔষধ প্রয়োগ</title>
    <desc>কতদিন পর কোন সার (রিং বা ছিটিয়ে) দিতে হবে এবং কী প্রতিরোধক স্প্রে করতে হবে।</desc>
  </step>
  <step>
    <day_offset>60</day_offset>
    <title>৭. রোগ ও পোকা-মাকড় দমন</title>
    <desc>এই জাতের প্রধান ২-৩টি রোগ, মাঠের লক্ষণ এবং দমন করার জন্য ঔষধের গ্রুপের নাম ও প্রয়োগমাত্রা।</desc>
  </step>
  <step>
    <day_offset>90</day_offset>
    <title>৮. ফসল সংগ্রহ</title>
    <desc>কতদিন পর ফসল পেকেছে বোঝার উপায় এবং বাজারদর অনুযায়ী কোন অবস্থায় হার্ভেস্ট করতে হবে তা বিস্তারিত লিখুন।</desc>
  </step>
</timeline>
`;

        await env.DB.prepare("UPDATE ai_api_keys SET status = 'active', reset_date = NULL WHERE status = 'exhausted' AND reset_date <= datetime('now', '-24 hours')").run();
        const keysRes = await env.DB.prepare("SELECT id, api_key FROM ai_api_keys WHERE status = 'active'").all();
        let availableKeys = keysRes.results || [];

        if (availableKeys.length === 0) {
            return json({ success: false, error: 'এআই কোটা শেষ। দয়া করে আগামীকাল চেষ্টা করুন।' }, { status: 500 });
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
                        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
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
            return json({ success: false, error: 'No working API keys remaining today. Error: ' + lastErrorMsg }, { status: 500 });
        }

        await env.DB.prepare("UPDATE ai_api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?").bind(successKeyId).run().catch(() => { });

        const toEngNum = (str) => str ? str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)) : '';
        const extractNum = (tag) => {
            const match = aiRawText.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'si'));
            if (!match) return 0;
            return parseFloat(toEngNum(match[1]).replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
        };

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
                    day_offset: dayMatch ? parseInt(dayMatch[1].replace(/[^\d]/g, '')) || 0 : 0,
                    title: titleMatch ? titleMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
                    description: descMatch ? descMatch[1].replace(/<[^>]*>?/gm, '').trim() : ''
                };
            });
        }

        // Set expiry dynamically (6 months for AI generated)
        await env.DB.prepare("INSERT OR REPLACE INTO ai_timeline_cache (crop_name, variety_name, base_yield_kg, base_cost_taka, base_revenue_taka, timeline_json, risks_json, resources_json, crop_market_price_bdt, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+6 months'))")
            .bind(cropName, varietyName, base_yield_kg, base_cost_taka, base_revenue_taka, JSON.stringify(timeline), JSON.stringify(risks), JSON.stringify(financial_resources), crop_market_price_bdt)
            .run();

        return json({ success: true, message: 'AI Generated and Cached' });

    } catch (error) {
        console.error("AI Generation Admin Error:", error.message);
        return json({ success: false, error: 'এনালাইসিসে একটি ত্রুটি হয়েছে: ' + error.message }, { status: 500 });
    }
}
