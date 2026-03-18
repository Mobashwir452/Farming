export const getPredictionRules = async (request, env) => {
    try {
        const { results } = await env.DB.prepare("SELECT * FROM ai_prediction_baselines ORDER BY id").all();
        return Response.json({ success: true, rules: results || [] });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const savePredictionRules = async (request, env) => {
    try {
        const body = await request.json();
        const { id, crop_name, avg_yield, avg_cost } = body;
        
        if (id) {
            await env.DB.prepare("UPDATE ai_prediction_baselines SET crop_name=?, avg_yield=?, avg_cost=? WHERE id=?")
                .bind(crop_name, avg_yield, avg_cost, id).run();
        } else {
            await env.DB.prepare("INSERT INTO ai_prediction_baselines (crop_name, avg_yield, avg_cost) VALUES (?, ?, ?)")
                .bind(crop_name, avg_yield, avg_cost).run();
        }
        
        return Response.json({ success: true, message: 'Prediction baseline saved successfully' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
