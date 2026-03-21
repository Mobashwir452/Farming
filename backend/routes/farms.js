import { error, json } from 'itty-router';

export const createFarm = async (request, env) => {
    try {
        const { name, area_shotangsho, location } = await request.json();

        if (!name || !area_shotangsho) {
            return error(400, 'Valid name and area_shotangsho are required.');
        }

        const farmerId = request.user.id;

        const insertQuery = `
            INSERT INTO farms (farmer_id, name, area_shotangsho, location) 
            VALUES (?, ?, ?, ?) RETURNING id;
        `;
        const result = await env.DB.prepare(insertQuery).bind(farmerId, name, parseFloat(area_shotangsho), location || null).first();

        return json({
            success: true,
            message: 'Land saved successfully',
            farm: {
                id: result.id,
                name: name,
                area_shotangsho: area_shotangsho
            }
        });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

export const getFarms = async (request, env) => {
    try {
        const farmerId = request.user.id;

        // Fetch farms and current active crop if any
        const farmsWithCropsQuery = `
            SELECT f.id, f.name, f.area_shotangsho, f.created_at, 
                   c.crop_name, c.status as crop_status 
            FROM farms f
            LEFT JOIN crops c ON c.farm_id = f.id AND c.status != 'Harvested'
            WHERE f.farmer_id = ? 
            ORDER BY f.created_at DESC
        `;
        const { results: farms } = await env.DB.prepare(farmsWithCropsQuery).bind(farmerId).all();

        return json({
            success: true,
            farms: farms
        });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

export const getFarmDetails = async (request, env) => {
    try {
        const farmerId = request.user.id;
        const farmId = request.params.id;

        const farmQuery = `SELECT * FROM farms WHERE id = ? AND farmer_id = ?`;
        const farm = await env.DB.prepare(farmQuery).bind(farmId, farmerId).first();

        if (!farm) return error(404, 'Land not found');

        const cropsQuery = `SELECT * FROM crops WHERE farm_id = ? ORDER BY created_at DESC`;
        const { results: crops } = await env.DB.prepare(cropsQuery).bind(farmId).all();

        return json({
            success: true,
            farm,
            crops
        });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

export const updateFarm = async (request, env) => {
    try {
        const farmerId = request.user.id;
        const farmId = parseInt(request.params.id, 10);
        const { name } = await request.json();

        if (!name) return error(400, 'Name is required');

        const updateQuery = `UPDATE farms SET name = ? WHERE id = ? AND farmer_id = ?`;
        await env.DB.prepare(updateQuery).bind(name, farmId, farmerId).run();

        return json({ success: true, message: 'Farm updated successfully' });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

export const deleteFarm = async (request, env) => {
    try {
        const farmerId = request.user.id;
        const farmId = parseInt(request.params.id, 10);

        // 1. Fetch orphaned images to delete from R2
        const { results: orphanCrops } = await env.DB.prepare("SELECT image_r2_key FROM crops WHERE farm_id = ? AND image_r2_key IS NOT NULL").bind(farmId).all();
        if (orphanCrops && orphanCrops.length > 0) {
            try {
                const keysToDelete = orphanCrops.map(c => c.image_r2_key);
                await env.IMAGE_BUCKET.delete(keysToDelete);
            } catch (r2Err) {
                console.error("Failed to delete orphaned R2 images during complete farm teardown: ", r2Err);
            }
        }

        // 2. Delete crops first to satisfy FOREIGN KEY constraint!
        await env.DB.prepare(`DELETE FROM crops WHERE farm_id = ?`).bind(farmId).run();

        const deleteQuery = `DELETE FROM farms WHERE id = ? AND farmer_id = ?`;
        await env.DB.prepare(deleteQuery).bind(farmId, farmerId).run();

        return json({ success: true, message: 'Farm deleted successfully' });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};
