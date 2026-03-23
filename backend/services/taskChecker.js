export const checkOverdueTasks = async (env) => {
    try {
        const { results: activeCrops } = await env.DB.prepare("SELECT id, tasks_state_json FROM crops WHERE status NOT IN ('Harvested', 'At Risk')").all();
        
        const now = new Date();
        now.setHours(0,0,0,0);

        for (const crop of activeCrops) {
            let tasks = [];
            try { tasks = JSON.parse(crop.tasks_state_json || '[]'); } catch(e){}
            
            let hasOverdue = false;
            for (const task of tasks) {
                if (task.status !== 'completed' && task.due_date) {
                    const dueDate = new Date(task.due_date);
                    if (dueDate < now) {
                        hasOverdue = true;
                        break;
                    }
                }
            }

            if (hasOverdue) {
                await env.DB.prepare("UPDATE crops SET status = 'At Risk' WHERE id = ?").bind(crop.id).run();
            }
        }
        console.log("TaskChecker Completed.");
    } catch (err) {
        console.error("Task Checker Error:", err);
    }
};
