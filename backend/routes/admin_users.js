import { error, json } from 'itty-router';

// GET /api/admin/users
export const getUsers = async (request, env) => {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit')) || 20;
        const page = parseInt(searchParams.get('page')) || 1;
        const offset = (page - 1) * limit;

        let query = `
            SELECT id, full_name, phone_number, is_active, subscription_status, created_at,
                   remaining_scans, remaining_timelines, remaining_chats,
                   (SELECT COUNT(*) FROM farms WHERE farmer_id = farmers.id) as total_lands
            FROM farmers
        `;
        let params = [];

        if (search) {
            query += ` WHERE phone_number LIKE ? OR full_name LIKE ?`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const { results } = await env.DB.prepare(query).bind(...params).all();
        
        // Count total for pagination
        let countQuery = `SELECT COUNT(*) as total FROM farmers`;
        let countParams = [];
        if (search) {
            countQuery += ` WHERE phone_number LIKE ? OR full_name LIKE ?`;
            countParams.push(`%${search}%`, `%${search}%`);
        }
        const totalResult = await env.DB.prepare(countQuery).bind(...countParams).first();

        return json({
            success: true,
            data: results,
            pagination: {
                total: totalResult.total,
                page,
                limit,
                totalPages: Math.ceil(totalResult.total / limit)
            }
        });
    } catch (err) {
        return error(500, 'Error fetching users: ' + err.message);
    }
};

// GET /api/admin/users/:id/details
export const getUserDetails = async (request, env) => {
    try {
        const id = request.params.id;
        
        // Basic Info
        const user = await env.DB.prepare(`
            SELECT id, full_name, phone_number, is_active, subscription_status, subscription_expiry,
                   remaining_scans, remaining_timelines, remaining_chats, created_at
            FROM farmers WHERE id = ?
        `).bind(id).first();

        if (!user) return error(404, 'User not found');

        // Lands (Farms) Info
        const { results: lands } = await env.DB.prepare(`
            SELECT id, name, area_shotangsho, location, created_at 
            FROM farms WHERE farmer_id = ?
        `).bind(id).all();

        // Financials (Overall Total Income and Expense)
        let total_income = 0;
        let total_expense = 0;

        const { results: txs } = await env.DB.prepare(`
            SELECT type, SUM(amount_bdt) as total
            FROM transactions
            WHERE farmer_id = ?
            GROUP BY type
        `).bind(id).all();

        for (const row of txs) {
            if (row.type === 'income') total_income = parseFloat(row.total || 0);
            if (row.type === 'expense') total_expense = parseFloat(row.total || 0);
        }

        const financials = {
            total_income,
            total_expense
        };

        // Activity (Crop Scans)
        const { results: activity } = await env.DB.prepare(`
            SELECT id, image_url, disease_name_bn as ai_diagnosis, created_at 
            FROM crop_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        `).bind(id).all();

        return json({
            success: true,
            data: {
                user,
                lands,
                financials,
                activity
            }
        });
    } catch (err) {
        return error(500, 'Error fetching details: ' + err.message);
    }
};

// PUT /api/admin/users/:id/status
export const toggleUserStatus = async (request, env) => {
    try {
        const id = request.params.id;
        const { is_active } = await request.json();

        const result = await env.DB.prepare(`
            UPDATE farmers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(is_active ? 1 : 0, id).run();

        if (!result.success) return error(500, 'Failed to update user status');

        return json({ success: true, message: 'User status updated successfully' });
    } catch (err) {
        return error(500, err.message);
    }
};

// POST /api/admin/users/:id/clear-pin
export const clearUserPin = async (request, env) => {
    try {
        const id = request.params.id;

        const result = await env.DB.prepare(`
            UPDATE farmers SET pin_hash = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(id).run();

        if (!result.success) return error(500, 'Failed to clear user PIN');

        return json({ success: true, message: 'PIN cleared successfully' });
    } catch (err) {
        return error(500, err.message);
    }
};

// GET /api/admin/users/:id/transactions
export const getUserTransactions = async (request, env) => {
    try {
        const id = request.params.id;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const offset = (page - 1) * limit;

        const countResult = await env.DB.prepare(`
            SELECT COUNT(*) as total 
            FROM transactions 
            WHERE farmer_id = ?
        `).bind(id).first();
        const total = countResult.total;

        const { results: dbTransactions } = await env.DB.prepare(`
            SELECT id, type, category, description, amount_bdt as amount, transaction_date as date
            FROM transactions 
            WHERE farmer_id = ?
            ORDER BY transaction_date DESC
            LIMIT ? OFFSET ?
        `).bind(id, limit, offset).all();

        const paginatedTxs = dbTransactions.map(tx => ({
            ...tx,
            title: tx.category || tx.description || 'Unknown'
        }));

        return json({
            success: true,
            data: paginatedTxs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        return error(500, 'Error fetching transactions: ' + err.message);
    }
};

