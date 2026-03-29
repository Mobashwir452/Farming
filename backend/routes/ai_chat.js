import { json } from 'itty-router';

export const handleCropChat = async (request, env) => {
    try {
        const body = await request.json();
        const { query, farmId, cropTitle } = body;

        if (!query) return json({ success: false, error: 'Query is missing' }, { status: 400 });

        let filterCropTitle = cropTitle;
        if (farmId && !filterCropTitle) {
            const farm = await env.DB.prepare(`
                SELECT c.crop_name, c.variety_name 
                FROM crops c 
                WHERE c.id = ?
            `).bind(farmId).first();
            
            if (farm && farm.variety_name) filterCropTitle = `${farm.crop_name} (${farm.variety_name})`;
            else if (farm) filterCropTitle = farm.crop_name;
        }

        // 1. Generate query embedding
        const embeddingsResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
        const queryVector = embeddingsResponse.data[0];

        // 2. Query Vectorize for top 3 matching contexts
        let vectorQueryOptions = { topK: 3, returnMetadata: 'all' };
        
        let contextTexts = [];
        
        try {
            const vectorResults = await env.VECTORIZE.query(queryVector, vectorQueryOptions);
            
            // Extract IDs
            if (vectorResults && vectorResults.matches && vectorResults.matches.length > 0) {
                // Fetch the actual text chunks from D1 using the matched IDs
                const matchIds = vectorResults.matches.map(m => m.id);
                const placeholders = matchIds.map(() => '?').join(',');
                
                const d1Results = await env.DB.prepare(`SELECT chunk_text FROM ai_rag_documents WHERE id IN (${placeholders})`).bind(...matchIds).all();
                
                if (d1Results && d1Results.results) {
                    contextTexts = d1Results.results.map(r => r.chunk_text);
                }
            }
        } catch(e) {
            console.error("Vectorize Query Fast Fail:", e);
        }

        const contextStr = contextTexts.length > 0 ? contextTexts.join("\n\n---\n\n") : "We have no stored encyclopedia context for this.";

        // 3. Fallback Gemini LLM Generation using Context
        // Check for active API key
        const keysRes = await env.DB.prepare("SELECT id, api_key FROM ai_api_keys WHERE status = 'active'").all();
        let availableKeys = keysRes.results || [];

        if (availableKeys.length === 0) {
            return json({ success: false, error: 'API limits exhausted, please try later.' }, { status: 429 });
        }

        const keyObj = availableKeys[Math.floor(Math.random() * availableKeys.length)];
        let aiResponseText = "";
        
        const promptText = `You are a professional Agronomist AI designed to help farmers in Bangladesh. 
Answer their question directly, kindly and specifically in Bengali Language.
If the answer is present in the <Provided_Context> below, use it entirely!
If it is NOT present in the context, you can use your general knowledge but DO NOT makeup fake statistics. Keep it short.

<Provided_Context>
${contextStr}
</Provided_Context>

<Farmer_Question>
${query}
</Farmer_Question>
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${keyObj.api_key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
            })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message);
        
        aiResponseText = data.candidates[0].content.parts[0].text;

        // DB Update Usage
        await env.DB.prepare(`UPDATE ai_api_keys SET last_used = CURRENT_TIMESTAMP, today_usage = today_usage + 1, total_usage = total_usage + 1 WHERE id = ?`).bind(keyObj.id).run().catch(()=>{});

        // 4. Log the interaction
        const logId = crypto.randomUUID();
        
        // Did we use context or fallback? We can trace by string matching partially or just log.
        if (contextTexts.length === 0) {
            await env.DB.prepare("INSERT INTO ai_missed_queries (query_text, crop_name) VALUES (?, ?)").bind(query, filterCropTitle || 'General').run().catch(()=>{});
        }
        
        await env.DB.prepare("INSERT INTO ai_chat_logs (id, crop_name, query_text, response_text, created_at) VALUES (?, ?, ?, ?, datetime('now'))").bind(logId, filterCropTitle || 'General', query, aiResponseText).run().catch(()=>{});

        return json({ success: true, answer: aiResponseText });
        
    } catch(err) {
        console.error("Chat Error:", err);
        return json({ success: false, error: err.message }, { status: 500 });
    }
};
