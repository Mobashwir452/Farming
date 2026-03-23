export const runCropVerification = async (env, cropId = null) => {
    let stats = { processedCount: 0, successCount: 0, failedCount: 0, messages: [] };
    try {
        console.log("CRON: Starting Auto-Verification Job...");

        let query = "SELECT id, crop_name, variety_name FROM crops_master_data WHERE verified_status = 0 AND (data_source IS NULL OR data_source != 'AI Verified') LIMIT 5";
        let params = [];
        
        if (cropId) {
            query = "SELECT id, crop_name, variety_name FROM crops_master_data WHERE id = ?";
            params = [cropId];
        }

        const unverified = await env.DB.prepare(query).bind(...params).all();

        if (!unverified.results || unverified.results.length === 0) {
            console.log("CRON: No unverified crops found. Done.");
            stats.messages.push("No unverified crops found. Done.");
            return stats;
        }

        stats.processedCount = unverified.results.length;
        console.log(`CRON: Found ${unverified.results.length} unverified crops to process.`);

        await env.DB.prepare("UPDATE ai_api_keys SET status = 'active', reset_date = NULL WHERE status = 'exhausted' AND reset_date <= datetime('now', '-24 hours')").run();
        const keyObj = await env.DB.prepare("SELECT id, api_key FROM ai_api_keys WHERE status = 'active' LIMIT 1").first();

        if (!keyObj) {
            console.error("CRON: No active AI keys available.");
            stats.messages.push("No active AI keys available.");
            return stats;
        }

        for (const crop of unverified.results) {
            console.log(`CRON: Verifying ${crop.crop_name}...`);
            const promptText = `
Act as an expert Agronomist in Bangladesh. Provide data for EXACTLY 1 ACRE of land for the crop/variety: "${crop.crop_name} (${crop.variety_name})".
Search your knowledge base for Bangladesh Agricultural Research Institute (BARI) or BRRI data.
Output your response STRICTLY using ONLY the following XML tags translated to Bengali. Do not use JSON.

<avg_duration_days>Write exactly digits only, e.g. 110</avg_duration_days>
<base_yield_kg>Write exactly digits only, e.g. 2400 (per Acre)</base_yield_kg>
<disease_resistance>Short text describing resistance, e.g. ব্লাস্ট ও পাতা পোড়া রোগ প্রতিরোধী</disease_resistance>
<disease_resistance_score>Write exactly digits 1 to 10</disease_resistance_score>
<planting_months>Comma separated English months, e.g. November, December</planting_months>
<crop_category>Write exactly ONE of these options in Bengali: সবজি, ফল, দানা, ডাল, তেল, ফুল, অর্থকরী, মসলা</crop_category>
<suitable_regions>Short text in Bengali, e.g. দেশের সব অঞ্চল (হাওর বাদে)</suitable_regions>
<soil_type>Short text in Bengali, e.g. দোআঁশ ও বেলে দোআঁশ মাটি</soil_type>
<special_features>Short text in Bengali, e.g. আগাম জাত, খরা সহনশীল</special_features>

<base_cost_taka>Write exactly digits only, e.g. 15000</base_cost_taka>
<base_revenue_taka>Write exactly digits only, e.g. 30000</base_revenue_taka>

<risks>
  <risk>
    <type>warning</type>
    <message>Short Bengali warning here</message>
  </risk>
</risks>

<timeline>
  <step>
    <title>১. বীজ বা চারার পরিমাণ ও শোধন</title>
    <desc>১ শতাংশ জমির জন্য কতটুকু বীজ/চারা লাগবে। সরাসরি বীজ এবং চারা রোপণ- উভয় পদ্ধতির নিয়ম। বীজ শোধনের জন্য কোন ঔষধ পরিমিত পানিতে কতক্ষণ ভেজাতে হবে।</desc>
  </step>
  <step>
    <title>২. জমি প্রস্তুতকরণ</title>
    <desc>কয়টি চাষ/মই দিতে হবে। বেড/মাদার মাপ (ফিট হিসেবে) এবং বীজ বা চারার দূরত্ব (ফিট হিসেবে)।</desc>
  </step>
  <step>
    <title>৩. প্রাথমিক সার প্রয়োগ</title>
    <desc>১ শতাংশ বা ১টি মাদার জন্য কি কি সার কতটুকু দিতে হবে, মাটি ওলটপালট করে সারের গ্যাস বের করতে কতদিন ফেলে রাখতে হবে।</desc>
  </step>
  <step>
    <title>৪. বপন বা রোপণ</title>
    <desc>সঠিক সময় এবং রোপণের সঠিক গভীরতা।</desc>
  </step>
  <step>
    <title>৫. সেচ ও আন্তঃপরিচর্যা</title>
    <desc>প্রথম সেচ ও নিয়মিত সেচের রুটিন, মালচিং, আগাছা দমন, মাচা বা খুঁটি দেওয়া।</desc>
  </step>
  <step>
    <title>৬. উপরি সার ও ঔষধ প্রয়োগ</title>
    <desc>কতদিন পর কোন সার (রিং বা ছিটিয়ে) দিতে হবে এবং কী প্রতিরোধক স্প্রে করতে হবে।</desc>
  </step>
  <step>
    <title>۷. রোগ ও পোকা-মাকড় দমন</title>
    <desc>এই জাতের প্রধান ২-৩টি রোগ, মাঠের লক্ষণ এবং দমন করার জন্য ঔষধের গ্রুপের নাম ও প্রয়োগমাত্রা।</desc>
  </step>
  <step>
    <title>৮. ফসল সংগ্রহ</title>
    <desc>কতদিন পর ফসল পেকেছে বোঝার উপায় এবং বাজারদর অনুযায়ী কোন অবস্থায় হার্ভেস্ট করতে হবে তা বিস্তারিত লিখুন।</desc>
  </step>
</timeline>
`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${keyObj.api_key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: { temperature: 0.1 }
                })
            });

            const data = await response.json();
            if (data.error) {
                console.error("CRON AI Error for " + crop.crop_name, data.error.message);
                continue; // try next
            }

            const aiText = data.candidates[0].content.parts[0].text;

            const extractStr = (tag) => {
                const match = aiText.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'si'));
                return match ? match[1].trim() : '';
            };
            const extractNum = (tag) => parseFloat(extractStr(tag).replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;

            const days = extractNum('avg_duration_days');
            const yieldShotangsho = extractNum('base_yield_kg');
            const crop_market_price_bdt = extractNum('crop_market_price_bdt_per_kg') || 30;
            const resText = extractStr('disease_resistance');
            const resScore = extractNum('disease_resistance_score');
            const planM = extractStr('planting_months');
            let catMatch = extractStr('crop_category');
            
            const suitableRegions = extractStr('suitable_regions');
            const soilType = extractStr('soil_type');
            const specialFeatures = extractStr('special_features');
            
            let financial_resources = [];
            let base_cost_taka = 0;
            const resourcesBlock = aiText.match(/<financial_resources>([\s\S]*?)(?:<\/financial_resources>|$)/i);
            if (resourcesBlock) {
                const resMatches = [...resourcesBlock[1].matchAll(/<resource>([\s\S]*?)<\/resource>/gi)];
                financial_resources = resMatches.map((m) => {
                    const block = m[1];
                    const nameMatch = block.match(/<name>([\s\S]*?)<\/name>/i);
                    const amountMatch = block.match(/<amount>([\s\S]*?)<\/amount>/i);
                    const costMatch = block.match(/<estimated_cost_bdt>([\s\S]*?)<\/estimated_cost_bdt>/i);
                    const cost = costMatch ? parseFloat(costMatch[1].replace(/[^\d\.]/g, '')) || 0 : 0;
                    base_cost_taka += cost;
                    return {
                        name: nameMatch ? nameMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
                        amount: amountMatch ? amountMatch[1].replace(/<[^>]*>?/gm, '').trim() : '',
                        estimated_cost_bdt: cost
                    };
                });
            }
            
            const base_revenue_taka = yieldShotangsho * crop_market_price_bdt;

            let risks = [];
            const risksBlock = aiText.match(/<risks>([\s\S]*?)(?:<\/risks>|$)/i);
            if (risksBlock) {
                const riskMatches = [...risksBlock[1].matchAll(/<risk>[\s\S]*?<type>(.*?)<\/type>[\s\S]*?<message>(.*?)<\/message>[\s\S]*?(?:<\/risk>|$)/gi)];
                risks = riskMatches.map(m => ({ type: m[1].trim(), message: m[2].replace(/<[^>]*>?/gm, '').trim() }));
            }

            let timeline = [];
            const timelineBlock = aiText.match(/<timeline>([\s\S]*?)(?:<\/timeline>|$)/i);
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

            // basic fallback map
            if (!['সবজি', 'ফল', 'দানা', 'ডাল', 'তেল', 'ফুল', 'অর্থকরী', 'মসলা'].includes(catMatch)) {
                catMatch = 'অন্যান্য';
            }

            if (yieldShotangsho > 0 && planM !== '') {
                // Populate data_source to mark as AI Processed, but leave verified_status = 0 for human review
                await env.DB.prepare(`
                    UPDATE crops_master_data 
                    SET avg_duration_days = ?, base_yield_per_shotangsho_kg = ?, disease_resistance = ?, disease_resistance_score = ?, planting_months = ?, crop_category = ?, suitable_regions = ?, soil_type = ?, special_features = ?, data_source = 'AI Verified'
                    WHERE id = ? AND verified_status = 0
                `).bind(days, yieldShotangsho, resText, resScore, planM, catMatch, suitableRegions, soilType, specialFeatures, crop.id).run().catch(e => console.error(e));
                
                await env.DB.prepare("INSERT OR REPLACE INTO ai_timeline_cache (crop_name, variety_name, base_yield_kg, base_cost_taka, base_revenue_taka, timeline_json, risks_json, resources_json, crop_market_price_bdt, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+6 months'))")
                    .bind(crop.crop_name, crop.variety_name, yieldShotangsho, base_cost_taka, base_revenue_taka, JSON.stringify(timeline), JSON.stringify(risks), JSON.stringify(financial_resources), crop_market_price_bdt)
                    .run().catch(e => console.error(e));

                console.log(`CRON: Successfully populated data for ${crop.crop_name}, awaiting Admin Review.`);
                stats.successCount++;
                stats.messages.push(`পরিপূর্ণ ভেরিফাইড: ${crop.crop_name}`);
            } else {
                console.log(`CRON: Verification failed for ${crop.crop_name} due to missing tags.`);
                stats.failedCount++;
                stats.messages.push(`অসম্পূর্ণ/ব্যর্থ: ${crop.crop_name}`);
            }
        }
        return stats;
    } catch (err) {
        console.error("CRON Global Error:", err.message);
        stats.messages.push(`সার্ভার এরর: ${err.message}`);
        return stats;
    }
};
