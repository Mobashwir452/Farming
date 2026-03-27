import { analyzeCropImage } from '../utils/ai_engine.js';

export const analyzePublicCropImage = async (request, env) => {
    try {
        const url = new URL(request.url);
        
        let body;
        try {
            body = await request.json();
        } catch(e) {
            return Response.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
        }

        const imageBase64 = body.imageBase64;
        const compressedBase64 = body.compressedBase64 || null;
        const farmId = body.farmId || null; // Optional
        
        let userId = null;
        if (request.user) {
            if (request.user.role === 'admin' || request.user.role === 'Super Admin') {
                userId = 0; // 0 denotes Admin
            } else {
                userId = request.user.id || request.user.userId || body.userId || null;
            }
        } else {
            userId = body.userId || null;
        }

        if (!imageBase64) {
            return Response.json({ success: false, error: 'Image base64 data is required.' }, { status: 400 });
        }
        
        // Strip out the data URL prefix if it exists (e.g. data:image/jpeg;base64,...)
        let rawBase64 = imageBase64;
        if (imageBase64.includes(',')) {
            rawBase64 = imageBase64.split(',')[1];
        }

        // Forward to the central AI engine which handles the Gemini 3 Flash parsing
        // We pass the RAW BASE64 to Gemini, but the original compressed WebP string to R2
        const scanResult = await analyzeCropImage(env, rawBase64, farmId, userId, compressedBase64);

        return Response.json({ success: true, data: scanResult });

    } catch (err) {
        console.error("Public Crop Doctor Error:", err.message);
        return Response.json({ 
            success: false, 
            error: 'রোগ শনাক্তকরণে ত্রুটি হয়েছে, দয়া করে আবার চেষ্টা করুন বা পরিষ্কার ছবি দিন। ' + err.message 
        }, { status: 500 });
    }
};

export const getPublicScanLogs = async (request, env) => {
    try {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit')) || 20;
        const farmId = url.searchParams.get('farm_id');

        const userId = request.user ? (request.user.id || request.user.userId) : null;
        if (!userId) {
            return Response.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
        }

        let query = `
            SELECT id, user_id, farm_id, image_url, disease_name_bn, disease_name_en, confidence_score, status, scan_result_json, created_at 
            FROM crop_scans 
            WHERE user_id = ? 
        `;
        let params = [userId];

        if (farmId) {
            query += ` AND farm_id = ? `;
            params.push(farmId);
        }

        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(limit);

        const { results } = await env.DB.prepare(query).bind(...params).all();

        return Response.json({ success: true, scans: results || [] });
    } catch (e) {
        console.error("Error fetching public scan logs:", e);
        return Response.json({ success: false, error: 'স্ক্যান রেকর্ড লোড করতে সমস্যা হচ্ছে।' }, { status: 500 });
    }
};
