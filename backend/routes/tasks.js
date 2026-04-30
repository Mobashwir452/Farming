import { error, json } from 'itty-router';

export const getGlobalTasks = async (request, env) => {
    try {
        const farmerId = request.user.id;

        const query = `
            SELECT f.name as farm_name, c.id as crop_id, c.crop_name, c.tasks_state_json 
            FROM crops c 
            JOIN farms f ON c.farm_id = f.id 
            WHERE f.farmer_id = ? AND c.status != 'Harvested'
        `;
        
        const { results } = await env.DB.prepare(query).bind(farmerId).all();
        
        let allTasks = [];
        
        if (results) {
            for (const row of results) {
                let tasks = [];
                try {
                    tasks = JSON.parse(row.tasks_state_json || '[]');
                } catch(e) {}
                
                // Inject crop info
                tasks.forEach(t => {
                    t.crop_id = row.crop_id;
                    t.crop_name = row.crop_name;
                    t.farm_name = row.farm_name;
                    allTasks.push(t);
                });
            }
        }
        
        return json({
            success: true,
            tasks: allTasks
        });
        
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

export const updateGlobalTask = async (request, env) => {
    try {
        const farmerId = request.user.id;
        const cropId = request.params.cropId;
        const taskId = request.params.taskId;
        
        const { action, newDate } = await request.json(); // action: 'done', 'skip', 'reschedule'

        // 1. Verify ownership
        const query = `
            SELECT c.tasks_state_json 
            FROM crops c 
            JOIN farms f ON c.farm_id = f.id 
            WHERE f.farmer_id = ? AND c.id = ?
        `;
        const crop = await env.DB.prepare(query).bind(farmerId, cropId).first();
        
        if (!crop) {
            return error(404, 'Crop not found or unauthorized');
        }
        
        let tasks = [];
        try {
            tasks = JSON.parse(crop.tasks_state_json || '[]');
        } catch(e) {}
        
        let taskUpdated = false;
        
        for (let t of tasks) {
            if (t.id === taskId) {
                if (action === 'done') {
                    t.status = 'completed';
                    t.is_completed = true;
                } else if (action === 'skip') {
                    t.status = 'skipped';
                    t.is_skipped = true;
                } else if (action === 'reschedule' && newDate) {
                    t.due_date = newDate;
                }
                taskUpdated = true;
                break;
            }
        }
        
        if (!taskUpdated) {
            return error(404, 'Task not found in crop');
        }
        
        // Sort tasks again just in case dates changed
        tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        
        const newJson = JSON.stringify(tasks);
        
        await env.DB.prepare(`UPDATE crops SET tasks_state_json = ? WHERE id = ?`)
            .bind(newJson, cropId)
            .run();
            
        return json({ success: true, message: 'Task updated successfully' });
        
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};
