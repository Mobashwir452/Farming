import { json } from 'itty-router';

export const handleCropChat = async (request, env) => {
    try {
        const body = await request.json();
        const { query, farmId, cropTitle, sessionId, userId, history } = body;

        if (!query) return json({ success: false, error: 'Query is missing' }, { status: 400 });

        let filterCropTitle = cropTitle;

        // --- Subscription & Limit Check ---
        if (request.user && request.user.role !== 'admin' && request.user.role !== 'Super Admin' && userId) {
            const farmerInfo = await env.DB.prepare("SELECT subscription_status, remaining_chats FROM farmers WHERE id = ?").bind(userId).first();
            if (farmerInfo && farmerInfo.subscription_status !== 'pro') {
                if (farmerInfo.remaining_chats <= 0) {
                    return Response.json({ success: false, error: 'Limit reached. Please upgrade to Pro for unlimited chat.' }, { status: 402 });
                }
                // Deduct 1 Chat
                await env.DB.prepare("UPDATE farmers SET remaining_chats = remaining_chats - 1 WHERE id = ?").bind(userId).run();
            }
        }
        // ----------------------------------

        if (farmId && !filterCropTitle) {
            const farm = await env.DB.prepare(`
                SELECT c.crop_name, c.variety_name 
                FROM crops c 
                WHERE c.id = ?
            `).bind(farmId).first();
            
            if (farm && farm.variety_name) filterCropTitle = `${farm.crop_name} (${farm.variety_name})`;
            else if (farm) filterCropTitle = farm.crop_name;
        }
        
        const cropNameForPrompt = filterCropTitle || 'General';

        // 1 & 2. Fetch Context (Bypass Vectorize for Banglish accuracy if Crop is known)
        let contextTexts = [];
        
        if (cropNameForPrompt !== 'General') {
            // Direct D1 lookup - Fetch ONLY the latest 1 chunk to prevent context overflow!
            try {
                const dbLookup = await env.DB.prepare(`SELECT chunk_text FROM ai_rag_documents WHERE crop_name = ? ORDER BY created_at DESC LIMIT 1`).bind(cropNameForPrompt).all();
                if (dbLookup && dbLookup.results && dbLookup.results.length > 0) {
                    contextTexts = dbLookup.results.map(r => r.chunk_text);
                }
            } catch(e) {
                console.error("D1 Context Lookup Error:", e);
            }
        }

        // Fallback to Vectorize if direct lookup fails or if crop is unknown
        if (contextTexts.length === 0) {
            try {
                const embeddingsResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
                const queryVector = embeddingsResponse.data[0];
                
                let vectorQueryOptions = { topK: 3, returnMetadata: 'all' };
                const vectorResults = await env.VECTORIZE.query(queryVector, vectorQueryOptions);
                
                if (vectorResults && vectorResults.matches && vectorResults.matches.length > 0) {
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
        }

        const contextStr = contextTexts.length > 0 ? contextTexts.join("\n\n---\n\n") : "We have no stored encyclopedia context for this.";

        // 3. Fallback to Cloudflare AI Generation using Context
        let aiResponseText = "";
        
        const systemPrompt = `You are a highly professional AgriTech BD Assistant.
The user is currently on the crop page: "${cropNameForPrompt}".

[PRIORITY 1 - ENGLISH CONTEXT MATCH]: You will receive an English <Context> about ${cropNameForPrompt}. You MUST use this context first to find the exact and accurate answer. Translate your final response to fluent, natural Bengali.
[PRIORITY 2 - GENERAL CROP KNOWLEDGE]: If the <Context> does not contain the specific answer, but the question is about the crop "${cropNameForPrompt}" (e.g., asking for a specific pesticide brand, or advanced farming tips not in the text), use your pre-trained agricultural knowledge to help the farmer accurately. Reply in fluent Bengali.
[PRIORITY 3 - IRRELEVANT FILTER]: If the user asks about an entirely different crop, or a non-agricultural topic (like politics, sports, music), politely decline in Bengali, stating that you are dedicated only to ${cropNameForPrompt}.

Do not expose that you are reading English text or translating. Always act like a native Bengali agricultural expert. Use local BD context where applicable.`;

        let messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Append past history if provided (Keep only last 4 messages to save tokens)
        if (Array.isArray(history)) {
            const recentHistory = history.slice(-4);
            messages = messages.concat(recentHistory);
        }

        // Append current query with Context
        const finalUserPrompt = `[ENGLISH CONTEXT START]
${contextStr}
[ENGLISH CONTEXT END]

User Query: ${query}`;

        messages.push({ role: 'user', content: finalUserPrompt });

        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', { 
            messages,
            max_tokens: 1024
        });
        
        aiResponseText = response.response || (typeof response === 'string' ? response : JSON.stringify(response));

        // 4. Log the interaction Session-Based
        const activeSessionId = sessionId || crypto.randomUUID();
        const activeUserId = userId || 'anonymous';
        
        // Update history array for DB
        const newHistory = Array.isArray(history) ? [...history] : [];
        newHistory.push({ role: 'user', content: query });
        newHistory.push({ role: 'assistant', content: aiResponseText });
        
        const historyJson = JSON.stringify(newHistory);

        // Check if session exists to decide Insert or Update
        const sessionCheck = await env.DB.prepare("SELECT session_id FROM ai_chat_logs WHERE session_id = ?").bind(activeSessionId).first();

        if (sessionCheck) {
            await env.DB.prepare("UPDATE ai_chat_logs SET chat_history = ?, updated_at = datetime('now') WHERE session_id = ?")
                .bind(historyJson, activeSessionId).run().catch((e)=> console.error("Update Log Error:", e));
        } else {
            await env.DB.prepare("INSERT INTO ai_chat_logs (session_id, user_id, crop_name, chat_history, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))")
                .bind(activeSessionId, activeUserId, cropNameForPrompt, historyJson).run().catch((e)=> console.error("Insert Log Error:", e));
        }

        if (contextTexts.length === 0) {
            await env.DB.prepare("INSERT INTO ai_missed_queries (query_text, crop_name) VALUES (?, ?)").bind(query, cropNameForPrompt).run().catch(()=>{});
        }

        return json({ success: true, answer: aiResponseText, sessionId: activeSessionId });
        
    } catch(err) {
        console.error("Chat Error:", err);
        return json({ success: false, error: err.message }, { status: 500 });
    }
};
