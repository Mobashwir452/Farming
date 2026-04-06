export const saveCropTimeline = async (request, env) => {
    try {
        const body = await request.json();
        const farmerId = request.user.id;

        // Verify the farm belongs to the farmer
        const farmCheck = await env.DB.prepare("SELECT id FROM farms WHERE id = ? AND farmer_id = ?").bind(body.farm_id, farmerId).first();
        if (!farmCheck) {
            return Response.json({ success: false, error: 'Unauthorized farm access' }, { status: 403 });
        }

        // --- Subscription & Limit Check ---
        if (body.is_ai_generated) {
            const farmerInfo = await env.DB.prepare("SELECT subscription_status, remaining_timelines FROM farmers WHERE id = ?").bind(farmerId).first();
            if (farmerInfo && farmerInfo.subscription_status !== 'pro') {
                if (farmerInfo.remaining_timelines <= 0) {
                    return Response.json({ success: false, error: 'Limit reached. Please upgrade to Pro.' }, { status: 402 });
                }
                // Deduct 1 limit
                await env.DB.prepare("UPDATE farmers SET remaining_timelines = remaining_timelines - 1 WHERE id = ?").bind(farmerId).run();
            }
        }
        // ----------------------------------

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
        const tasksState = (body.daily_tasks || []).map(t => {
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

export const getCropById = async (request, env) => {
    try {
        const cropId = request.params.id;
        const query = `
            SELECT c.id, c.farm_id, c.crop_name, c.status, c.planted_date, f.name as farm_name 
            FROM crops c
            JOIN farms f ON c.farm_id = f.id
            WHERE c.id = ?
        `;
        const crop = await env.DB.prepare(query).bind(cropId).first();
        if (!crop) {
            return Response.json({ success: false, error: 'Crop not found' }, { status: 404 });
        }
        return Response.json({ success: true, crop });
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
        if (body.notes_json !== undefined) {
            updates.push('notes_json = ?');
            params.push(body.notes_json);
        }
        if (body.initial_plant_count !== undefined) {
            updates.push('initial_plant_count = ?');
            params.push(body.initial_plant_count);
        }
        if (body.loss_events_json !== undefined) {
            updates.push('loss_events_json = ?');
            params.push(body.loss_events_json);
        }
        if (body.planted_date !== undefined) {
            updates.push('planted_date = ?');
            params.push(body.planted_date);
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

export const deleteCrop = async (request, env) => {
    try {
        const cropId = request.params.id;
        const farmerId = request.user.id;
        
        const check = await env.DB.prepare("SELECT c.id, c.image_r2_key FROM crops c JOIN farms f ON c.farm_id = f.id WHERE c.id = ? AND f.farmer_id = ?").bind(cropId, farmerId).first();
        if (!check) return Response.json({ success: false, error: 'Unauthorized or crop not found' }, { status: 403 });

        if (env.IMAGE_BUCKET) {
            // Delete main crop cover image
            if (check.image_r2_key) {
                try { await env.IMAGE_BUCKET.delete(check.image_r2_key); } catch(e) { console.error("R2 cover cleanup fail:", e); }
            }

            // Delete all plant images and related media in R2 using prefix bounds
            try {
                const prefix = `farmers/${farmerId}/crops/${cropId}/`;
                const listed = await env.IMAGE_BUCKET.list({ prefix });
                let objectsToDelete = [];
                for (let obj of listed.objects) {
                    objectsToDelete.push(obj.key);
                }
                if (objectsToDelete.length > 0) {
                    await env.IMAGE_BUCKET.delete(objectsToDelete);
                }
            } catch(e) { 
                console.error("R2 prefix cleanup fail:", e); 
            }
        }
        
        await env.DB.prepare("DELETE FROM crops WHERE id = ?").bind(cropId).run();
        
        return Response.json({ success: true, message: 'Crop deleted completely along with all R2 media' });
    } catch(e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const completeCrop = async (request, env) => {
    try {
        const cropId = request.params.id;
        const farmerId = request.user.id;
        const bodyObj = await request.json().catch(() => ({}));
        
        const check = await env.DB.prepare("SELECT c.id FROM crops c JOIN farms f ON c.farm_id = f.id WHERE c.id = ? AND f.farmer_id = ?").bind(cropId, farmerId).first();
        if (!check) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });

        let sql = "UPDATE crops SET status = ?, yield_amount_kg = yield_amount_kg + ?, harvest_notes = COALESCE(harvest_notes, '') || ? WHERE id = ?";
        
        const finalStatus = bodyObj.status || 'Harvested';
        const addedYield = parseFloat(bodyObj.yield_amount_kg) || 0;
        const addNotes = bodyObj.harvest_notes ? `\n[${new Date().toISOString().split('T')[0]}] ${bodyObj.harvest_notes}` : '';

        await env.DB.prepare(sql).bind(finalStatus, addedYield, addNotes, cropId).run();
        
        return Response.json({ success: true, message: 'Crop marked as complete' });
    } catch(e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const updateCropStatusManually = async (request, env) => {
    try {
        const cropId = request.params.id;
        const farmerId = request.user.id;
        const body = await request.json();
        
        if(!body.status) return Response.json({ success: false, error: "Empty status" }, { status: 400 });

        const check = await env.DB.prepare("SELECT c.id FROM crops c JOIN farms f ON c.farm_id = f.id WHERE c.id = ? AND f.farmer_id = ?").bind(cropId, farmerId).first();
        if (!check) return Response.json({ success: false }, { status: 403 });

        await env.DB.prepare("UPDATE crops SET status = ? WHERE id = ?").bind(body.status, cropId).run();
        
        return Response.json({ success: true, message: 'Status updated' });
    } catch(e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const addCropNote = async (request, env) => {
    try {
        const cropId = request.params.id;
        const farmerId = request.user.id;
        const { note } = await request.json();
        
        if(!note) return Response.json({ success: false, error: "Empty note" }, { status: 400 });

        const check = await env.DB.prepare("SELECT c.id, c.notes_json FROM crops c JOIN farms f ON c.farm_id = f.id WHERE c.id = ? AND f.farmer_id = ?").bind(cropId, farmerId).first();
        if (!check) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });

        let existingNotes = [];
        try { existingNotes = JSON.parse(check.notes_json || '[]'); } catch(e){}
        
        existingNotes.push({ date: new Date().toISOString(), text: note });

        await env.DB.prepare("UPDATE crops SET notes_json = ? WHERE id = ?").bind(JSON.stringify(existingNotes), cropId).run();
        
        return Response.json({ success: true, message: 'Note added successfully' });
    } catch(e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
