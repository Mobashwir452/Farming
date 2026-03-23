export const generateCropReport = async (request, env) => {
    try {
        const cropId = request.params.id;
        const farmerId = request.user.id;
        
        const query = `
            SELECT c.*, f.name as farm_name, f.area_shotangsho 
            FROM crops c
            JOIN farms f ON c.farm_id = f.id
            WHERE c.id = ? AND f.farmer_id = ?
        `;
        const cropRow = await env.DB.prepare(query).bind(cropId, farmerId).first();
        if(!cropRow) return Response.json({ success: false, error: 'Crop not found' }, { status: 404 });

        const report = {
            farm: { name: cropRow.farm_name, area: cropRow.area_shotangsho },
            crop: { 
                name: cropRow.crop_name, 
                status: cropRow.status, 
                planted: cropRow.planted_date,
                revenue_bdt: cropRow.expected_revenue_bdt,
                cost_bdt: cropRow.expected_cost_bdt
            },
            notes: [],
            completed_tasks: 0,
            pending_tasks: 0,
            resources: []
        };

        try { report.notes = JSON.parse(cropRow.notes_json || '[]'); } catch(e){}
        
        const tasks = JSON.parse(cropRow.tasks_state_json || '[]');
        report.completed_tasks = tasks.filter(t => t.status === 'completed').length;
        report.pending_tasks = tasks.filter(t => t.status !== 'completed').length;
        
        const resources = JSON.parse(cropRow.resources_state_json || '[]');
        report.resources = resources.map(r => ({ name: r.name, cost: r.estimated_cost_bdt || 0, status: r.status }));

        return Response.json({ success: true, report_data: report });
    } catch(err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
};
