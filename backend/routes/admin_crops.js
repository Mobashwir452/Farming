import { error, json } from 'itty-router';

const formatVarietyName = (cropName, varietyName) => {
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

export const getMasterCrops = async (request, env) => {
    try {
        const query = `
            SELECT 
                cmd.*,
                CASE WHEN atc.id IS NOT NULL THEN 1 ELSE 0 END as has_cache
            FROM crops_master_data cmd
            LEFT JOIN ai_timeline_cache atc 
                ON atc.crop_name = cmd.crop_name 
                AND atc.variety_name = CASE 
                    WHEN cmd.variety_name IS NOT NULL AND cmd.variety_name != '' 
                    THEN cmd.variety_name 
                    ELSE cmd.crop_name 
                END
            ORDER BY cmd.id DESC
        `;
        const { results } = await env.DB.prepare(query).all();

        return json({ success: true, crops: results });
    } catch (err) {
        return error(500, err.message);
    }
};

export const addMasterCrop = async (request, env) => {
    try {
        const data = await request.json();

        const insertQuery = `
            INSERT INTO crops_master_data (
                crop_category, crop_name, variety_name, suitable_regions, 
                soil_type, base_yield_per_shotangsho_kg, avg_duration_days, 
                disease_resistance, special_features, data_source, verified_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        const cleanedVariety = formatVarietyName(data.crop_name, data.variety_name);

        await env.DB.prepare(insertQuery).bind(
            data.crop_category, data.crop_name, cleanedVariety,
            data.suitable_regions, data.soil_type, data.base_yield_per_shotangsho_kg,
            data.avg_duration_days, data.disease_resistance, data.special_features,
            data.data_source
        ).run();

        return json({ success: true, message: 'Crop added to master database' });
    } catch (err) {
        return error(500, err.message);
    }
};

export const editMasterCrop = async (request, env) => {
    try {
        const id = request.params.id;
        const data = await request.json();

        const updateQuery = `
            UPDATE crops_master_data SET
                crop_category = ?, crop_name = ?, variety_name = ?, suitable_regions = ?, 
                soil_type = ?, base_yield_per_shotangsho_kg = ?, avg_duration_days = ?, 
                disease_resistance = ?, special_features = ?, data_source = ?
            WHERE id = ?
        `;

        const cleanedVariety = formatVarietyName(data.crop_name, data.variety_name);

        await env.DB.prepare(updateQuery).bind(
            data.crop_category, data.crop_name, cleanedVariety,
            data.suitable_regions, data.soil_type, data.base_yield_per_shotangsho_kg,
            data.avg_duration_days, data.disease_resistance, data.special_features,
            data.data_source, id
        ).run();

        return json({ success: true, message: 'Crop updated successfully' });
    } catch (err) {
        return error(500, err.message);
    }
};

export const deleteMasterCrop = async (request, env) => {
    try {
        const id = request.params.id;
        await env.DB.prepare(`DELETE FROM crops_master_data WHERE id = ?`).bind(id).run();
        return json({ success: true, message: 'Crop deleted successfully' });
    } catch (err) {
        return error(500, err.message);
    }
};

export const addBulkMasterCrops = async (request, env) => {
    try {
        const data = await request.json();
        const crops = data.crops;

        if (!crops || crops.length === 0) {
            return error(400, 'No valid crops data provided');
        }

        const statements = crops.map(c => {
            const cleanedVariety = formatVarietyName(c.crop_name, c.variety_name);
            return env.DB.prepare(`
                INSERT INTO crops_master_data (
                    crop_category, crop_name, variety_name, suitable_regions, 
                    soil_type, base_yield_per_shotangsho_kg, avg_duration_days, 
                    disease_resistance, special_features, data_source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                c.crop_category, c.crop_name, cleanedVariety,
                c.suitable_regions, c.soil_type, c.base_yield_per_shotangsho_kg,
                c.avg_duration_days, c.disease_resistance, c.special_features,
                c.data_source
            );
        });

        await env.DB.batch(statements);

        return json({ success: true, message: `${crops.length} crops added successfully` });
    } catch (err) {
        return error(500, err.message);
    }
};

export const updateCropStatus = async (request, env) => {
    try {
        const id = request.params.id;
        const body = await request.json();

        if (body.status === -1) {
            // Reject: Delete from master and clean cache
            const crop = await env.DB.prepare("SELECT crop_name, variety_name FROM crops_master_data WHERE id = ?").bind(id).first();
            if (crop) {
                const mapVariety = (crop.variety_name && crop.variety_name.trim() !== '') ? crop.variety_name : crop.crop_name;
                await env.DB.prepare("DELETE FROM ai_timeline_cache WHERE crop_name = ? AND variety_name = ?").bind(crop.crop_name, mapVariety).run();
            }
            await env.DB.prepare(`DELETE FROM crops_master_data WHERE id = ?`).bind(id).run();
            return json({ success: true, message: 'Pending AI crop rejected and removed.' });
        }

        // Approve: set verified_status = 1
        await env.DB.prepare(`UPDATE crops_master_data SET verified_status = 1 WHERE id = ?`).bind(id).run();
        return json({ success: true, message: 'Crop approved successfully' });
    } catch (err) {
        return error(500, err.message);
    }
};

export const syncCropFromCache = async (request, env) => {
    try {
        const id = request.params.id;
        
        const crop = await env.DB.prepare("SELECT * FROM crops_master_data WHERE id = ?").bind(id).first();
        if (!crop) return error(404, 'ফসল পাওয়া যায়নি (Crop not found)');

        const mapVariety = (crop.variety_name && crop.variety_name.trim() !== '') ? crop.variety_name : crop.crop_name;
        const cache = await env.DB.prepare("SELECT * FROM ai_timeline_cache WHERE crop_name = ? AND variety_name = ?").bind(crop.crop_name, mapVariety).first();
        
        if (!cache) return error(400, 'এই ফসলের কোনো টাইমলাইন ক্যাশ নেই!');

        let newDuration = crop.avg_duration_days || 0;
        if (cache.timeline_json) {
            try {
                const parsed = JSON.parse(cache.timeline_json);
                const allOffsets = [];
                if (parsed.guideline) parsed.guideline.forEach(g => allOffsets.push(parseInt(g.day_offset) || 0));
                if (parsed.tasks) parsed.tasks.forEach(t => allOffsets.push(parseInt(t.day_offset) || 0));
                if (allOffsets.length > 0) {
                    const maxOffset = Math.max(...allOffsets);
                    if (maxOffset > 0) newDuration = maxOffset;
                }
            } catch(e){}
        }

        const newYield = cache.base_yield_kg || crop.base_yield_per_shotangsho_kg;

        await env.DB.prepare(`
            UPDATE crops_master_data 
            SET base_yield_per_shotangsho_kg = ?, avg_duration_days = ?, verified_status = 1 
            WHERE id = ?
        `).bind(newYield, newDuration, id).run();

        return json({ success: true, message: 'ক্যাশ থেকে মাস্টার টেবিলে সফলভাবে ডাটা সিঙ্ক হয়েছে এবং অ্যাপ্রুভ হয়েছে!' });
    } catch (err) {
        return error(500, err.message);
    }
};
