export const saveCropTimeline = async (request, env) => {
    try {
        const body = await request.json();
        const farmerId = request.user.id;

        // Verify the farm belongs to the farmer
        const farmCheck = await env.DB.prepare("SELECT id FROM farms WHERE id = ? AND farmer_id = ?").bind(body.farm_id, farmerId).first();
        if (!farmCheck) {
            return Response.json({ success: false, error: 'Unauthorized farm access' }, { status: 403 });
        }

        // Handle Image Upload to Cloudflare R2 if provided
        let r2Key = null;
        if (body.base64_image) {
            try {
                // Strip the data:image/webp;base64, prefix
                const base64Data = body.base64_image.replace(/^data:image\/\w+;base64,/, '');
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                r2Key = `farmers/${farmerId}/crops/${crypto.randomUUID()}.webp`;

                // Upload directly to bound R2 bucket
                await env.IMAGE_BUCKET.put(r2Key, bytes.buffer, {
                    httpMetadata: { contentType: 'image/webp' }
                });
            } catch (err) {
                console.error("R2 Upload Error:", err);
                // We'll proceed without the image if parsing fails
            }
        }

        // Setup initial task tracking schedule
        const startDate = new Date(body.planting_date || Date.now());
        const tasksState = (body.timeline || []).map(t => {
            const taskDate = new Date(startDate);
            taskDate.setDate(startDate.getDate() + (t.day_offset || 0));
            return {
                ...t,
                id: crypto.randomUUID(), // For frontend marking
                due_date: taskDate.toISOString().split('T')[0],
                status: 'pending' // pending, completed
            };
        });

        // Setup financial tracker
        const resourcesState = (body.resources || []).map(r => ({
            ...r,
            id: crypto.randomUUID(), // For frontend marking
            status: 'pending' // pending, bought
        }));

        const expected_revenue = parseFloat((String(body.finance?.revenue || '0')).replace(/[^\d\.]/g, '')) || 0;
        const expected_cost = parseFloat((String(body.finance?.cost || '0')).replace(/[^\d\.]/g, '')) || 0;

        // Insert Crop and get the generated ID
        const insertRes = await env.DB.prepare(`
            INSERT INTO crops (
                farm_id, crop_name, status, planted_date, image_r2_key,
                expected_revenue_bdt, expected_cost_bdt, resources_state_json, tasks_state_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            body.farm_id, 
            body.crop_name, 
            body.status || 'Healthy', 
            startDate.toISOString().split('T')[0], 
            r2Key,
            expected_revenue,
            expected_cost,
            JSON.stringify(resourcesState),
            JSON.stringify(tasksState)
        ).run();

        const cropId = insertRes.meta.last_row_id;

        return Response.json({ success: true, message: 'Crop and timeline saved successfully', crop_id: cropId });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const searchCrops = async (request, env) => {
    try {
        const url = new URL(request.url);
        const q = url.searchParams.get('q') || '';

        if (!q || q.length < 2) {
            return Response.json({ success: true, results: [] });
        }

        const query = `
            SELECT crop_name, variety_name, disease_resistance_score, base_yield_per_shotangsho_kg, verified_status 
            FROM crops_master_data 
            WHERE crop_name LIKE ? OR variety_name LIKE ?
            ORDER BY verified_status DESC, base_yield_per_shotangsho_kg DESC 
            LIMIT 10;
        `;

        const results = await env.DB.prepare(query).bind(`%${q}%`, `%${q}%`).all();
        return Response.json({ success: true, results: results.results || [] });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const updateCropState = async (request, env) => {
    try {
        const cropId = request.params.id;
        const farmerId = request.user.id;
        const body = await request.json();

        // Security Check: Ensure farm belongs to the current specific farmer 
        const checkQuery = `
            SELECT c.id FROM crops c
            JOIN farms f ON c.farm_id = f.id
            WHERE c.id = ? AND f.farmer_id = ?
        `;
        const check = await env.DB.prepare(checkQuery).bind(cropId, farmerId).first();
        
        if (!check) {
            return Response.json({ success: false, error: 'Unauthorized or crop not found' }, { status: 403 });
        }

        // We only update what is provided
        const updates = [];
        const params = [];

        if (body.tasks_state_json) {
            updates.push('tasks_state_json = ?');
            params.push(body.tasks_state_json);
        }
        if (body.resources_state_json) {
            updates.push('resources_state_json = ?');
            params.push(body.resources_state_json);
        }
        
        if (updates.length > 0) {
            params.push(cropId);
            const query = `UPDATE crops SET ${updates.join(', ')} WHERE id = ?`;
            await env.DB.prepare(query).bind(...params).run();
        }

        return Response.json({ success: true, message: 'Crop state updated successfully' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

