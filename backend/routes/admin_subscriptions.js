import { error, json } from 'itty-router';

// Packages Management

export const getPackages = async (request, env) => {
    try {
        const { results } = await env.DB.prepare(`SELECT * FROM subscription_packages ORDER BY price_bdt ASC`).all();
        return json({ success: true, data: results });
    } catch (err) {
        return error(500, err.message);
    }
};

export const updatePackage = async (request, env) => {
    try {
        const id = request.params.id;
        const { name, duration_months, duration_days, price_bdt, scan_limit, timeline_limit, chat_limit, is_active } = await request.json();

        await env.DB.prepare(`
            UPDATE subscription_packages 
            SET name = ?, duration_months = ?, duration_days = ?, price_bdt = ?, scan_limit = ?, timeline_limit = ?, chat_limit = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(name, duration_months, duration_days || 0, price_bdt, scan_limit, timeline_limit, chat_limit, is_active !== undefined ? is_active : 1, id).run();

        return json({ success: true, message: 'Package updated' });
    } catch (err) {
        return error(500, err.message);
    }
};

export const addPackage = async (request, env) => {
    try {
        const { name, duration_months, duration_days, price_bdt, scan_limit, timeline_limit, chat_limit, is_active } = await request.json();

        await env.DB.prepare(`
            INSERT INTO subscription_packages 
            (name, duration_months, duration_days, price_bdt, scan_limit, timeline_limit, chat_limit, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(name, duration_months, duration_days || 0, price_bdt, scan_limit, timeline_limit, chat_limit, is_active !== undefined ? is_active : 1).run();

        return json({ success: true, message: 'Package created successfully' });
    } catch (err) {
        return error(500, err.message);
    }
};

export const deletePackage = async (request, env) => {
    try {
        const id = request.params.id;
        await env.DB.prepare(`DELETE FROM subscription_packages WHERE id = ?`).bind(id).run();
        return json({ success: true, message: 'Package deleted successfully' });
    } catch (err) {
        return error(500, err.message);
    }
};

// Active Subscribers

export const getActiveSubscribers = async (request, env) => {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        
        let query = `
            SELECT id, full_name, phone_number, subscription_status, subscription_expiry, remaining_scans 
            FROM farmers WHERE subscription_status = 'pro'
        `;
        let params = [];

        if (search) {
            query += ` AND phone_number LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY subscription_expiry DESC`;

        const { results } = await env.DB.prepare(query).bind(...params).all();

        return json({ success: true, data: results });
    } catch (err) {
        return error(500, err.message);
    }
};

// Payment History

export const getPaymentHistory = async (request, env) => {
    try {
        const { results } = await env.DB.prepare(`
            SELECT p.id, p.amount_paid, p.payment_method, p.trx_id, p.status, p.created_at,
                   f.phone_number, pkg.name as package_name
            FROM subscription_payments p
            JOIN farmers f ON p.farmer_id = f.id
            JOIN subscription_packages pkg ON p.package_id = pkg.id
            ORDER BY p.created_at DESC LIMIT 50
        `).all();

        return json({ success: true, data: results });
    } catch (err) {
        return error(500, err.message);
    }
};

// Manual Upgrade

export const manualUpgrade = async (request, env) => {
    try {
        const { farmer_id, phone_number, package_id, amount_paid, payment_method, trx_id } = await request.json();
        
        // Find Farmer directly by farmer_id if passed
        let farmer = null;
        if (farmer_id) {
            farmer = await env.DB.prepare(`SELECT id, phone_number FROM farmers WHERE id = ?`).bind(farmer_id).first();
        } else {
            farmer = await env.DB.prepare(`SELECT id, phone_number FROM farmers WHERE phone_number = ?`).bind(phone_number).first();
        }
        
        if (!farmer) return error(404, 'Farmer not found');

        // Find Package Details
        const pkg = await env.DB.prepare(`SELECT duration_months, duration_days, scan_limit, timeline_limit, chat_limit FROM subscription_packages WHERE id = ?`).bind(package_id).first();
        if (!pkg) return error(404, 'Package not found');

        // 1. Insert Payment Record
        await env.DB.prepare(`
            INSERT INTO subscription_payments (farmer_id, package_id, amount_paid, payment_method, trx_id, status, approved_by_admin_id)
            VALUES (?, ?, ?, ?, ?, 'approved', ?)
        `).bind(farmer.id, package_id, amount_paid, payment_method, trx_id, request.user?.id || 1).run(); // request.user from withAuth

        // 2. Update Farmer Subscription
        let expiryModifier = '+1 months'; // default
        if (pkg.duration_months > 0) {
            expiryModifier = `+${pkg.duration_months} months`;
        } else if (pkg.duration_days > 0) {
            expiryModifier = `+${pkg.duration_days} days`;
        }

        await env.DB.prepare(`
            UPDATE farmers 
            SET subscription_status = 'pro', 
                subscription_expiry = date('now', ?),
                remaining_scans = ?,
                remaining_timelines = ?,
                remaining_chats = ?
            WHERE id = ?
        `).bind(expiryModifier, pkg.scan_limit, pkg.timeline_limit, pkg.chat_limit, farmer.id).run();

        return json({ success: true, message: `Farmer ${farmer.phone_number || phone_number} successfully upgraded to Premium.` });
    } catch (err) {
        return error(500, err.message);
    }
};

// Payment Settings (Dynamic Bkash/Nagad configuration)

export const getPaymentSettings = async (request, env) => {
    try {
        const { results } = await env.DB.prepare(`SELECT * FROM payment_settings`).all();
        const settings = {};
        results.forEach(val => {
            settings[val.method_name] = val.number;
        });
        return json({ success: true, data: settings });
    } catch (err) {
        return error(500, err.message);
    }
};

export const updatePaymentSettings = async (request, env) => {
    try {
        const { bkash, nagad } = await request.json();
        const stmt = env.DB.prepare(`
            INSERT INTO payment_settings (method_name, number) VALUES (?, ?)
            ON CONFLICT(method_name) DO UPDATE SET number = excluded.number
        `);
        
        await env.DB.batch([
            stmt.bind('bkash', bkash),
            stmt.bind('nagad', nagad)
        ]);
        
        return json({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
        return error(500, err.message);
    }
};

// =======================
// Pending Payments
// =======================

export const getPendingPayments = async (request, env) => {
    try {
        const { results } = await env.DB.prepare(`
            SELECT p.id, p.amount_paid, p.payment_method, p.trx_id, p.created_at,
                   f.phone_number, f.full_name, pkg.name as package_name
            FROM subscription_payments p
            JOIN farmers f ON p.farmer_id = f.id
            JOIN subscription_packages pkg ON p.package_id = pkg.id
            WHERE p.status = 'pending'
            ORDER BY p.created_at ASC
        `).all();
        return json({ success: true, data: results });
    } catch (err) {
        return error(500, err.message);
    }
};

export const approvePayment = async (request, env) => {
    try {
        const id = request.params.id; // payment ID
        
        // 1. Get Payment & Package info
        const payment = await env.DB.prepare(`SELECT * FROM subscription_payments WHERE id = ? AND status = 'pending'`).bind(id).first();
        if (!payment) return error(404, 'Pending payment not found');

        const pkg = await env.DB.prepare(`SELECT * FROM subscription_packages WHERE id = ?`).bind(payment.package_id).first();
        if (!pkg) return error(404, 'Package not found');

        // 2. Update Payment Status
        await env.DB.prepare(`
            UPDATE subscription_payments 
            SET status = 'approved', approved_by_admin_id = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).bind(request.user?.id || 1, id).run();

        // 3. Update Farmer limits and expiry
        let expiryModifier = '+1 months'; // default
        if (pkg.duration_months > 0) {
            expiryModifier = `+${pkg.duration_months} months`;
        } else if (pkg.duration_days > 0) {
            expiryModifier = `+${pkg.duration_days} days`;
        }

        await env.DB.prepare(`
            UPDATE farmers 
            SET subscription_status = 'pro', 
                subscription_expiry = date('now', ?),
                remaining_scans = ?,
                remaining_timelines = ?,
                remaining_chats = ?
            WHERE id = ?
        `).bind(expiryModifier, pkg.scan_limit, pkg.timeline_limit, pkg.chat_limit, payment.farmer_id).run();

        return json({ success: true, message: 'পেমেন্ট সফলভাবে অ্যাপ্রুভ হয়েছে!' });
    } catch (err) {
        return error(500, err.message);
    }
};

export const rejectPayment = async (request, env) => {
    try {
        const id = request.params.id;
        await env.DB.prepare(`
            UPDATE subscription_payments 
            SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).bind(id).run();
        
        return json({ success: true, message: 'পেমেন্ট বাতিল করা হয়েছে!' });
    } catch (err) {
        return error(500, err.message);
    }
};

export const downgradeUser = async (request, env) => {
    try {
        const userId = request.params.id;
        
        // 1. Check if user exists
        const user = await env.DB.prepare(`SELECT id, subscription_status FROM farmers WHERE id = ?`).bind(userId).first();
        if (!user) return error(404, 'User not found');

        // 2. Clear all premium statuses: set status to 'free', expiry to NULL, and reset limits to default free-tier (e.g., 3 scans)
        await env.DB.prepare(`
            UPDATE farmers 
            SET subscription_status = 'free', 
                subscription_expiry = NULL,
                remaining_scans = 3,
                remaining_timelines = 2,
                remaining_chats = 5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(userId).run();
        
        // Note: we don't necessarily delete the past payment history, we just downgrade the user.

        return json({ success: true, message: 'ইউজারকে সফলভাবে ফ্রি টায়ারে নামানো হয়েছে!' });
    } catch (err) {
        return error(500, err.message);
    }
};

