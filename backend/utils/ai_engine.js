const MONTH_MAP = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

export const generateCropData = async (env, cropName, varietyName, options = {}) => {
    const isNewVarietySearch = options.isNewVarietySearch || false;
    const govtContext = options.govtContext || "";
    const forceOffSeason = options.forceOffSeason || false;
    const isOffSeason = options.isOffSeason || false;
    const exclusionListStr = options.exclusionListStr || "[]";

    let promptRow = null;
    let fallbackMessage = 'এআই সার্ভার এখন ব্যস্ত, একটু পর চেষ্টা করুন।';
    try {
        if (env && env.DB) {
            promptRow = await env.DB.prepare("SELECT system_role, template_body, fallback_message FROM ai_prompt_templates WHERE prompt_key = 'cache_generator_prompt'").first();
            if (promptRow && promptRow.fallback_message) fallbackMessage = promptRow.fallback_message;
        }
    } catch (ignore) { }

    const sysRole = promptRow?.system_role || 'Act as an expert Agronomist in Bangladesh.';
    let promptText = `${sysRole}\n`;

    // Inject Global Custom Instruction if available
    try {
        if (env && env.DB) {
            const globalRow = await env.DB.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'global_custom_instruction'").first();
            if (globalRow && globalRow.setting_value) {
                promptText += `\n[GLOBAL ADMIN INSTRUCTION - VERY IMPORTANT]: ${globalRow.setting_value}\n\n`;
            }
        }
    } catch (ignore) { /* Ignore if table doesn't exist yet */ }

    // Dynamic Context Injection
    let templateBody = promptRow?.template_body || '';

    // If templateBody contains the legacy hardcoded string we need to patch it out programmatically
    if (templateBody.includes('Find a completely NEW and profitable variety!')) {
        const splitIndex = templateBody.indexOf('[CRITICAL NEW INSTRUCTION for PLANTING METHOD]');
        if (splitIndex !== -1) {
            templateBody = templateBody.substring(splitIndex);
        }
    }

    // Now replace variables in the remaining or untouched templateBody
    templateBody = templateBody.replace(/{cropName}/g, cropName)
        .replace(/{varietyName}/g, varietyName)
        .replace(/{exclusionListStr}/g, exclusionListStr);

    promptText += templateBody + '\n\n';

    // Unconditionally append the strict instructions at the very end to guarantee correct focus
    if (!isNewVarietySearch) {
        promptText += `Provide data for EXACTLY 1 SHOTANGSHO (১ শতাংশ) of land specifically for the Crop: "${cropName}" and Variety: "${varietyName}".\n`;
        promptText += `Must output exactly: <variety_name>${varietyName}</variety_name>\n`;
        if (govtContext) promptText += `Use this official Government Database context strictly to govern your output: ${govtContext}\n`;
    } else {
        promptText += `The user requested to grow crop: "${cropName}". Your FIRST JOB is to identify the single BEST, highest-yielding, disease-resistant specific variety (জাত) for this crop in Bangladesh. Provide data for EXACTLY 1 SHOTANGSHO (১ শতাংশ) of land for this chosen variety.
Output the chosen specific variety name strictly inside <variety_name> Tags (e.g. <variety_name>তরমুজ (বিগ বস)</variety_name>).
If the user provided a variety name instead of a crop name, you MUST identify the actual generic crop name (e.g., পেঁপে, ধান, আলু) and output it strictly inside <actual_crop_name> Tags.
CRITICAL RULE: DO NOT SUGGEST ANY OF THESE FOLLOWING VARIETIES BECAUSE THEY ALREADY EXIST IN OUR DATABASE: ${exclusionListStr}. Find a completely NEW and profitable variety!\n`;
    }

    if (isOffSeason && forceOffSeason) {
        promptText += `\n[CRITICAL WARNING]: The farmer is planting this OFF-SEASON (currently ${MONTH_MAP[new Date().getMonth() + 1]}). You MUST reduce the yield output drastically compared to normal, explicitly mention the weather risks in the <risks> section, and adjust the timeline for adverse conditions!\n`;
    }

    // API Keys Daily Check & Reactivation
    // Google AI Studio resets quota at midnight Pacific Time (PT), which is UTC-8 (or UTC-7 PDT).
    await env.DB.prepare("UPDATE ai_api_keys SET today_usage = 0 WHERE date(last_used, '-8 hours') < date('now', '-8 hours')").run().catch(() => { });
    await env.DB.prepare("UPDATE ai_api_keys SET status = 'active', reset_date = NULL WHERE status = 'exhausted' AND reset_date <= datetime('now', '-24 hours')").run().catch(() => { });

    // 4. API Key Rotation System
    const keysRes = await env.DB.prepare("SELECT id, api_key FROM ai_api_keys WHERE status = 'active'").all();
    let availableKeys = keysRes.results || [];

    if (availableKeys.length === 0) {
        throw new Error(fallbackMessage);
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
                        temperature: 0.2, // Consistent slightly creative but stable temp across endpoints
                        maxOutputTokens: 8192
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
        await env.DB.prepare("INSERT INTO ai_logs (feature_type, crop_name, variety_name, status, error_message) VALUES (?, ?, ?, 'failed', ?)").bind(options.featureType || 'system', cropName, varietyName || '', lastErrorMsg).run().catch(() => { });
        throw new Error(fallbackMessage);
    }

    // Database Tracking Update (Must await so worker doesn't kill it)
    await env.DB.prepare(`
        UPDATE ai_api_keys 
        SET last_used = CURRENT_TIMESTAMP, 
            today_usage = today_usage + 1, 
            total_usage = total_usage + 1 
        WHERE id = ?
    `).bind(successKeyId).run().catch(() => { });
    await env.DB.prepare("INSERT INTO ai_logs (feature_type, crop_name, variety_name, status, error_message) VALUES (?, ?, ?, 'success', '')").bind(options.featureType || 'system', cropName, varietyName || '').run().catch(() => { });

    // 5. REGEX EXTRACTION (Bomb-proof Parsing)
    const toEngNum = (str) => str ? str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)) : '';
    const extractNum = (tag) => {
        const match = aiRawText.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'si'));
        if (!match) return 0;
        return parseFloat(toEngNum(match[1]).replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
    };
    const extractStr = (tag) => {
        const match = aiRawText.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'si'));
        return match ? match[1].replace(/<[^>]*>?/gm, '').trim() : '';
    };

    const extractedVariety = aiRawText.match(/<variety_name>(.*?)<\/variety_name>/i);
    let fallbackVarietyName = varietyName;
    if (isNewVarietySearch && (!extractedVariety || !extractedVariety[1])) {
        fallbackVarietyName = `${cropName} (AI Variety)`;
    }
    const finalVarietyName = (extractedVariety && extractedVariety[1]) ? extractedVariety[1].replace(/<[^>]*>?/gm, '').trim() : fallbackVarietyName;

    const extractedActualCrop = aiRawText.match(/<actual_crop_name>(.*?)<\/actual_crop_name>/i);
    const finalActualCropName = (extractedActualCrop && extractedActualCrop[1]) ? extractedActualCrop[1].replace(/<[^>]*>?/gm, '').trim() : null;

    const base_yield_kg = extractNum('base_yield_kg');
    const crop_market_price_bdt = extractNum('crop_market_price_bdt_per_kg') || 30; // fallback
    const avg_duration_days = extractNum('avg_duration_days');
    const disease_resistance_score = extractNum('disease_resistance_score');

    // Master data specifics
    const disease_resistance = extractStr('disease_resistance');
    const planting_months = extractStr('planting_months');
    let crop_category = extractStr('crop_category');
    if (!['সবজি', 'ফল', 'দানা', 'ডাল', 'তেল', 'ফুল', 'অর্থকরী', 'মসলা'].includes(crop_category)) {
        crop_category = 'অন্যান্য';
    }
    const suitable_regions = extractStr('suitable_regions');
    const soil_type = extractStr('soil_type');
    const special_features = extractStr('special_features');

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

    const project_lifespan = extractStr('project_lifespan');
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

    return {
        aiRawText, // Mostly for debugging if needed
        actual_crop_name: finalActualCropName,
        variety_name: finalVarietyName,
        base_yield_kg,
        crop_market_price_bdt,
        avg_duration_days,
        disease_resistance_score,
        disease_resistance,
        planting_months,
        crop_category,
        suitable_regions,
        soil_type,
        special_features,
        financial_resources,
        base_cost_taka,
        base_revenue_taka,
        risks,
        project_lifespan,
        timeline,
        daily_tasks
    };
};

export const analyzeCropImage = async (env, imageBase64, farmId = null, userId = null, compressedWebP = null, cropId = null) => {
    let customRules = '';
    try {
        const rulesRow = await env.DB.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'crop_doctor_rules'").first();
        if (rulesRow && rulesRow.setting_value) customRules = rulesRow.setting_value;
    } catch (e) { }

    const promptText = `
Act as an expert Agricultural Plant Pathologist in Bangladesh.
Analyze the provided crop image. 
[ADMIN DIAGNOSTIC RULES]: ${customRules}

You MUST output your response strictly using ONLY the following XML tags:
<status> (Must be exactly one of: disease_detected, healthy, not_a_crop) </status>
<disease_name_bn> (Bangla name of the disease or crop status) </disease_name_bn>
<disease_name_en> (Scientific/English name) </disease_name_en>
<confidence_score> (A number from 1 to 100) </confidence_score>
<symptoms> (রোগের লক্ষণসমূহ বা বর্তমানে গাছের অবস্থা বাংলায় বুলেট পয়েন্টে লিখুন) </symptoms>
<organic_solution> (Organic or natural remedies in Bengali) </organic_solution>
<chemical_solution> (Specific chemical sprays and exact doses available in Bangladesh in Bengali language) </chemical_solution>
<prevention> (Tips to prevent this in the future, fully in Bengali) </prevention>

Do not include Markdown blocks. Output only the pure XML.
`;

    // API Keys Daily Check & Reactivation
    await env.DB.prepare("UPDATE ai_api_keys SET today_usage = 0 WHERE date(last_used, '-8 hours') < date('now', '-8 hours')").run().catch(() => { });
    await env.DB.prepare("UPDATE ai_api_keys SET status = 'active', reset_date = NULL WHERE status = 'exhausted' AND reset_date <= datetime('now', '-24 hours')").run().catch(() => { });

    // API Key Rotation System
    const keysRes = await env.DB.prepare("SELECT id, api_key FROM ai_api_keys WHERE status = 'active'").all();
    let availableKeys = keysRes.results || [];

    if (availableKeys.length === 0) throw new Error('এআই সার্ভার এখন ব্যস্ত, একটু পর চেষ্টা করুন।');

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
                    contents: [{
                        parts: [
                            { text: promptText },
                            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
                        ]
                    }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
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
                } else throw new Error(data.error.message);
            }

            aiRawText = data.candidates[0].content.parts[0].text;
            successKeyId = keyObj.id;
            break;
        } catch (err) {
            lastErrorMsg = err.message;
            availableKeys.splice(index, 1);
        }
    }

    if (!aiRawText) throw new Error('API Request Failed: ' + lastErrorMsg);

    // Track API Hit
    await env.DB.prepare(`UPDATE ai_api_keys SET last_used = CURRENT_TIMESTAMP, today_usage = today_usage + 1, total_usage = total_usage + 1 WHERE id = ?`).bind(successKeyId).run().catch(() => { });

    // Bomb-proof XML Extractors
    const extractStr = (tag) => {
        const match = aiRawText.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'si'));
        return match ? match[1].replace(/<[^>]*>?/gm, '').trim() : '';
    };

    const statusObj = extractStr('status').toLowerCase();
    const finalStatus = (statusObj.includes('disease_detected') || statusObj.includes('detected')) ? 'disease_detected'
        : (statusObj.includes('healthy') ? 'healthy' : 'not_a_crop');

    const confidenceStr = extractStr('confidence_score');
    let confidence_score = parseFloat(confidenceStr.replace(/[^0-9.]/g, '')) || 0;

    const scanResultObj = {
        status: finalStatus,
        disease_name_bn: extractStr('disease_name_bn'),
        disease_name_en: extractStr('disease_name_en'),
        confidence_score,
        symptoms: extractStr('symptoms'),
        organic_solution: extractStr('organic_solution'),
        chemical_solution: extractStr('chemical_solution'),
        prevention: extractStr('prevention')
    };

    // R2 Image Upload Handling
    let r2Key = null;
    let r2SourceObj = compressedWebP || imageBase64;

    if (env.IMAGE_BUCKET && r2SourceObj) {
        try {
            const mimeMatch = r2SourceObj.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const ext = mimeType.replace('image/', '') || 'jpg';
            const cleanBase64 = r2SourceObj.replace(/^data:image\/\w+;base64,/, '');

            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            r2Key = `crop-scans/${crypto.randomUUID()}.${ext}`;
            await env.IMAGE_BUCKET.put(r2Key, bytes.buffer, { httpMetadata: { contentType: mimeType } });
        } catch (e) {
            console.error("R2 Upload failed:", e);
        }
    }

    // Store in Database
    try {
        await env.DB.prepare(`
            INSERT INTO crop_scans (user_id, farm_id, crop_id, image_url, disease_name_bn, disease_name_en, confidence_score, status, scan_result_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(userId, farmId, cropId, r2Key, scanResultObj.disease_name_bn, scanResultObj.disease_name_en, confidence_score, finalStatus, JSON.stringify(scanResultObj)).run();
    } catch (dbErr) { console.error("Could not save to crop_scans:", dbErr.message); }

    return scanResultObj;
};

// --- RAG Automated Encyclopedia Pipeline (Phase 8.2 & 8.5) ---
export const generateCropEncyclopedia = async (env, cropName, varietyName, forceRegenerate = false) => {
    try {
        const cropTitle = (varietyName && varietyName.trim() !== '') ? `${cropName} (${varietyName})` : cropName;

        // Check for Existing RAG
        const existingRAG = await env.DB.prepare("SELECT id FROM ai_rag_documents WHERE crop_name = ?").bind(cropTitle).first();
        
        if (existingRAG) {
            if (forceRegenerate) {
                console.log(`Force regenerating RAG for ${cropTitle}. Deleting old vector ID: ${existingRAG.id}...`);
                // Delete from Vectorize
                try { await env.VECTORIZE.deleteByIds([existingRAG.id]); } catch(e) { console.error("Vectorize Delete Error:", e); }
                // Delete from D1
                await env.DB.prepare("DELETE FROM ai_rag_documents WHERE id = ?").bind(existingRAG.id).run();
            } else {
                console.log(`RAG content already exists for ${cropTitle}. Skipping generation.`);
                return { success: true, skipped: true, message: "RAG already exists." };
            }
        }

        const promptText = `
Act as an expert Agronomist in Bangladesh.
Create a highly detailed, comprehensive crop encyclopedia and cultivation guide for the crop "${cropName}" (Variety: "${varietyName || 'যেকোনো'}") in Bangladesh.

You MUST respond strictly with a valid JSON object containing exactly two keys: "english_guide" and "bengali_guide". Do not wrap the JSON in markdown code blocks.

The "english_guide" value must be the complete guide written in English.
The "bengali_guide" value must be the exact translation of the guide written in fluent Bengali.

Both guides MUST use the following Markdown headings:
In English:
## Introduction & Environment
## Soil & Sowing
## Irrigation & Fertilizer
## Disease & Pest Control
## Harvest & Storage
## Expected Yield & Market

In Bengali:
## পরিচিতি ও উপযুক্ত পরিবেশ
## মাটি তৈরি ও বপন পদ্ধতি
## সেচ ও সার ব্যবস্থাপনা
## রোগবালাই ও পোকামাকড় দমন
## ফসল সংগ্রহ ও সংরক্ষণ
## ফলন ও বাজার সম্ভাবনা

Make the content as informative and practical as possible. Ensure no intro/outro conversational text exists outside the JSON object.
`;

        // API Keys Daily Check & Reactivation
        await env.DB.prepare("UPDATE ai_api_keys SET today_usage = 0 WHERE date(last_used, '-8 hours') < date('now', '-8 hours')").run().catch(() => { });
        await env.DB.prepare("UPDATE ai_api_keys SET status = 'active', reset_date = NULL WHERE status = 'exhausted' AND reset_date <= datetime('now', '-24 hours')").run().catch(() => { });

        // API Key Rotation System
        const keysRes = await env.DB.prepare("SELECT id, api_key FROM ai_api_keys WHERE status = 'active'").all();
        let availableKeys = keysRes.results || [];
        if (availableKeys.length === 0) throw new Error('No active API keys');

        let aiRawText = null;
        let successKeyId = null;

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
                if (data.error) throw new Error(data.error.message);
                if (!data.candidates || !data.candidates[0].content) {
                    throw new Error("Invalid Gemini response format (Possibly blocked by Safety Settings)");
                }
                let rawText = data.candidates[0].content.parts[0].text;
                rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const jsonDoc = JSON.parse(rawText);
                if (!jsonDoc.english_guide || !jsonDoc.bengali_guide) {
                     throw new Error("JSON response missing english_guide or bengali_guide.");
                }
                aiRawText = jsonDoc; // store as object
                successKeyId = keyObj.id;
                break;
            } catch (err) {
                console.error("Gemini Failure:", err.message);
                availableKeys.splice(index, 1);
            }
        }

        if (!aiRawText) {
            await env.DB.prepare("INSERT INTO ai_logs (feature_type, crop_name, status, error_message) VALUES ('rag_encyclopedia_generation', ?, 'failed', ?)").bind(cropTitle, 'Failed to generate content (All keys exhausted or models failed)').run().catch(()=>{});
            return { success: false, error: 'Failed to generate content' };
        }

        // The user requested a single giant row for the entire crop RAG instead of chunking
        const englishText = aiRawText.english_guide;
        const bengaliText = aiRawText.bengali_guide;

        // 3. Generate Vector Embeddings using Cloudflare AI
        // bge-base-en-v1.5 automatically truncates to 512 tokens. We pass the English text.
        const embeddingsResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [englishText] });
        const vectorData = embeddingsResponse.data[0];

        const id = crypto.randomUUID();
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // 4. Insert into D1 and Vectorize (Single Row)
        await env.VECTORIZE.upsert([{
            id: id,
            values: vectorData,
            metadata: { crop_name: cropTitle }
        }]);

        await env.DB.prepare("INSERT INTO ai_rag_documents (id, crop_name, chunk_text, chunk_text_bn, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, cropTitle, englishText, bengaliText, timestamp).run();

        // Track DB API Hit
        await env.DB.prepare(`UPDATE ai_api_keys SET last_used = CURRENT_TIMESTAMP, today_usage = today_usage + 1, total_usage = total_usage + 1 WHERE id = ?`).bind(successKeyId).run().catch(()=>{});
        // Log the structural operation successfully
        await env.DB.prepare("INSERT INTO ai_logs (feature_type, crop_name, status, error_message) VALUES ('rag_encyclopedia_generation', ?, 'success', ?)").bind(cropTitle, `Generated 1 chunk successfully.`).run().catch(()=>{});

        return { success: true, chunks: 1 };

    } catch (err) {
        console.error("RAG Encyclopedia Error:", err);
        await env.DB.prepare("INSERT INTO ai_logs (feature_type, crop_name, status, error_message) VALUES ('rag_encyclopedia_generation', ?, 'failed', ?)").bind(cropName, err.message).run().catch(()=>{});
        return { success: false, error: err.message };
    }
};
