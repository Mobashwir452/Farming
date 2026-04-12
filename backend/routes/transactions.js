// backend/routes/transactions.js

export const getTransactions = async (request, env) => {
    try {
        const cropId = request.params.id;
        const farmerId = request.user.id;

        // Verify ownership
        const checkQuery = `
            SELECT c.id FROM crops c
            JOIN farms f ON c.farm_id = f.id
            WHERE c.id = ? AND f.farmer_id = ?
        `;
        const check = await env.DB.prepare(checkQuery).bind(cropId, farmerId).first();
        if (!check) {
            return Response.json({ success: false, error: 'Unauthorized or crop not found' }, { status: 403 });
        }

        const query = `
            SELECT * FROM transactions 
            WHERE crop_id = ? AND farmer_id = ?
            ORDER BY transaction_date DESC
        `;
        const { results } = await env.DB.prepare(query).bind(cropId, farmerId).all();

        return Response.json({ success: true, transactions: results });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const addTransaction = async (request, env) => {
    try {
        const cropId = request.params.id;
        const farmerId = request.user.id;
        const body = await request.json();

        // Security Check: Ensure farm belongs to the current specific farmer 
        const checkQuery = `
            SELECT c.id, c.farm_id FROM crops c
            JOIN farms f ON c.farm_id = f.id
            WHERE c.id = ? AND f.farmer_id = ?
        `;
        const check = await env.DB.prepare(checkQuery).bind(cropId, farmerId).first();
        
        if (!check) {
            return Response.json({ success: false, error: 'Unauthorized or crop not found' }, { status: 403 });
        }

        if(!body.type || !body.category || !body.amount_bdt) {
            return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const query = `
            INSERT INTO transactions (farmer_id, crop_id, farm_id, type, category, amount_bdt, transaction_date, description)
            VALUES (?, ?, ?, ?, ?, ?, coalesce(?, CURRENT_TIMESTAMP), ?)
            RETURNING id, transaction_date
        `;
        const result = await env.DB.prepare(query).bind(
            farmerId, 
            cropId, 
            check.farm_id, 
            body.type, 
            body.category, 
            parseFloat(body.amount_bdt), 
            body.transaction_date || null,
            body.description || ''
        ).first();

        return Response.json({ success: true, transaction: { id: result.id, date: result.transaction_date } });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const updateTransaction = async (request, env) => {
    try {
        const cropId = request.params.id;
        const transactionId = request.params.txId;
        const farmerId = request.user.id;
        const body = await request.json();

        if(!body.type || !body.category || !body.amount_bdt) {
            return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const query = `
            UPDATE transactions 
            SET type = ?, category = ?, amount_bdt = ?, transaction_date = coalesce(?, transaction_date), description = ?
            WHERE id = ? AND crop_id = ? AND farmer_id = ?
        `;
        
        await env.DB.prepare(query).bind(
            body.type,
            body.category,
            parseFloat(body.amount_bdt),
            body.transaction_date || null,
            body.description || '',
            transactionId,
            cropId,
            farmerId
        ).run();

        return Response.json({ success: true, message: 'Transaction updated successfully' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};

export const deleteTransaction = async (request, env) => {
    try {
        const cropId = request.params.id;
        const transactionId = request.params.txId;
        const farmerId = request.user.id;

        const query = `DELETE FROM transactions WHERE id = ? AND crop_id = ? AND farmer_id = ?`;
        await env.DB.prepare(query).bind(transactionId, cropId, farmerId).run();

        return Response.json({ success: true, message: 'Transaction deleted' });
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
};
