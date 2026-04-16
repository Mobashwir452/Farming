import { json, error } from 'itty-router';

// Helper for saving images directly into R2 for plant tracker
export async function uploadPlantImage(request, env) {
    try {
        const { id: cropId } = request.params;
        const farmerId = request.user.id;
        const body = await request.json();
        
        if (!body.imageBase64 || !body.filename) {
            return error(400, "Missing image data or filename");
        }

        const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const r2Key = `farmers/${farmerId}/crops/${cropId}/plants/${body.filename}.webp`;

        await env.IMAGE_BUCKET.put(r2Key, bytes.buffer, {
            httpMetadata: { contentType: 'image/webp' }
        });

        // The public URL assuming the Worker exposes images via API or directly
        const url = `${new URL(request.url).origin}/api/public/images/${encodeURIComponent(r2Key)}`;
        
        return json({ success: true, url, key: r2Key });
    } catch (e) {
        return error(500, e.message);
    }
}

// 1. Get entire 3D Map Grid Data for a Crop (Now returning JSON embedded in beds)
export async function getPlantGrid(request, env) {
    try {
        const { id: cropId } = request.params;
        
        // Fetch beds (each bed contains its own plants array inside plants_nodes_json)
        const { results: beds } = await env.DB.prepare('SELECT * FROM crop_beds WHERE crop_id = ?').bind(cropId).all();
        
        return json({ success: true, beds });
    } catch (e) {
        return error(500, e.message);
    }
}

// 2. Generate Initial Map Grid (Wizard Submit)
export async function generatePlantGrid(request, env) {
    try {
        const { id: cropId } = request.params;
        const body = await request.json();
        const { numBeds, bedWidth, bedLength, plantSpacing, rowsPerBed } = body;

        if (!numBeds || numBeds <= 0) return error(400, "Invalid bed configuration");

        const beds = [];
        for (let i = 1; i <= numBeds; i++) {
            
            // Build the JSON Array of plants for this bed
            const plants = [];
            let plantCounter = 1;
            let treesPerRow = Math.floor(bedLength / plantSpacing);
            if (treesPerRow < 1) treesPerRow = 1;

            for (let r = 1; r <= rowsPerBed; r++) {
                for (let c = 1; c <= treesPerRow; c++) {
                    const dx = (r - (rowsPerBed + 1) / 2) * (bedWidth / (rowsPerBed + 1));
                    const dz = (c - (treesPerRow + 1) / 2) * plantSpacing;
                    
                    plants.push({
                        id: `B${i}-T${plantCounter}`,
                        x: dx,
                        z: dz,
                        row: r,
                        col: c,
                        state: 'H'
                    });
                    plantCounter++;
                }
            }
            
            const plantsJsonStr = JSON.stringify(plants);

            const { results } = await env.DB.prepare(`INSERT INTO crop_beds (crop_id, bed_name, width, length, plants_nodes_json) VALUES (?, ?, ?, ?, ?) RETURNING id`)
                .bind(cropId, `Bed-${i}`, bedWidth, bedLength, plantsJsonStr).all();
            
            const bedId = results[0].id;
            beds.push({ id: bedId, name: `Bed-${i}`, plants });
        }

        return json({ success: true, message: 'Grid generated successfully.', beds });
    } catch (e) {
        return error(500, e.message);
    }
}

// 3. Update Custom Bed Configuration (Override sizes or manual plant additions)
export async function updateBedConfig(request, env) {
    try {
        const { bedId } = request.params;
        const body = await request.json();
        
        let updates = [];
        let params = [];
        
        if (body.bed_name !== undefined) {
            updates.push('bed_name = ?');
            params.push(body.bed_name);
        }
        
        if (body.custom_settings !== undefined) {
            updates.push('custom_settings_json = ?');
            params.push(JSON.stringify(body.custom_settings));
        }
        
        if (body.plants_nodes_json !== undefined) {
            updates.push('plants_nodes_json = ?');
            // Check if string already, else stringify
            const plantsJsonStr = typeof body.plants_nodes_json === 'string' ? body.plants_nodes_json : JSON.stringify(body.plants_nodes_json);
            params.push(plantsJsonStr);
        }
        
        if (updates.length > 0) {
            const query = `UPDATE crop_beds SET ${updates.join(', ')} WHERE id = ?`;
            params.push(bedId);
            await env.DB.prepare(query).bind(...params).run();
        }
        
        return json({ success: true });
    } catch (e) {
        return error(500, e.message);
    }
}

// 4. Get generic logs for specific plant inside a bed
export async function getPlantLogs(request, env) {
    try {
        const { bedId, plantIdentifier } = request.params;
        const { results: logs } = await env.DB.prepare('SELECT * FROM plant_logs WHERE bed_id = ? AND plant_identifier = ? ORDER BY created_at DESC')
            .bind(bedId, plantIdentifier).all();
        return json({ success: true, logs });
    } catch (e) {
        return error(500, e.message);
    }
}

// 5. Add a log to a specific plant inside a bed
export async function addPlantLog(request, env) {
    try {
        const { bedId, plantIdentifier } = request.params;
        const body = await request.json();
        const { note, image_url } = body; 

        await env.DB.prepare(`INSERT INTO plant_logs (bed_id, plant_identifier, note, image_url) VALUES (?, ?, ?, ?)`)
            .bind(bedId, plantIdentifier, note || null, image_url || null).run();
            
        // Touch the last_updated_at timestamp for this plant inside crop_beds
        const { results: beds } = await env.DB.prepare('SELECT plants_nodes_json FROM crop_beds WHERE id = ?').bind(bedId).all();
        if (beds && beds.length > 0 && beds[0].plants_nodes_json) {
            let parsed = [];
            try { parsed = JSON.parse(beds[0].plants_nodes_json); } catch (e) {}
            let changed = false;
            parsed.forEach(node => {
                if (node.id === plantIdentifier) {
                    node.last_updated_at = Date.now();
                    changed = true;
                }
            });
            if (changed) {
                await env.DB.prepare('UPDATE crop_beds SET plants_nodes_json = ? WHERE id = ?')
                    .bind(JSON.stringify(parsed), bedId).run();
            }
        }
            
        return json({ success: true });
    } catch (e) {
        return error(500, e.message);
    }
}

// 6. Sync Full Crop Beds Layout
export async function syncCropBeds(request, env) {
    try {
        const { id: cropId } = request.params;
        const { beds } = await request.json();
        
        // 1. Get existing beds to find which ones to delete
        const { results: existingBeds } = await env.DB.prepare('SELECT id FROM crop_beds WHERE crop_id = ?').bind(cropId).all();
        const existingIds = existingBeds.map(b => b.id);
        
        const incomingIds = beds.filter(b => typeof b.id !== 'string' || !b.id.startsWith('mock-')).map(b => b.id);
        const toDeleteIds = existingIds.filter(id => !incomingIds.includes(id));
        
        // Delete removed beds
        for (const id of toDeleteIds) {
            await env.DB.prepare('DELETE FROM plant_logs WHERE bed_id = ?').bind(id).run();
            await env.DB.prepare('DELETE FROM crop_beds WHERE id = ? AND crop_id = ?').bind(id, cropId).run();
        }
        
        // 2. Insert or update
        for (let i = 0; i < beds.length; i++) {
            const bed = beds[i];
            const plantsJsonStr = JSON.stringify(bed.plants_nodes_json || []);
            
            const bedTitle = bed.bed_name || `Bed-${i + 1}`;
            if (typeof bed.id === 'string' && bed.id.startsWith('mock-')) {
                // Insert new bed
                await env.DB.prepare(`INSERT INTO crop_beds (crop_id, bed_name, plants_nodes_json) VALUES (?, ?, ?)`)
                    .bind(cropId, bedTitle, plantsJsonStr).run();
            } else {
                // Update existing bed
                await env.DB.prepare(`UPDATE crop_beds SET bed_name = ?, plants_nodes_json = ? WHERE id = ? AND crop_id = ?`)
                    .bind(bedTitle, plantsJsonStr, bed.id, cropId).run();
            }
        }
        
        return json({ success: true, message: 'Beds synced successfully' });
    } catch (e) {
        return error(500, e.message);
    }
}
