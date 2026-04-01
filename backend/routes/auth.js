import { error, json } from 'itty-router';
import bcrypt from 'bcryptjs';
import { signJWT, withAuth } from '../utils.js';

export const verifyFirebase = async (request, env) => {
    try {
        const { idToken, name, pin } = await request.json();
        if (!idToken) return error(400, 'Missing Firebase ID Token');

        // --- Mock Firebase JWT Verification ---
        let firebasePayload;
        try {
            const parts = idToken.split('.');
            if (parts.length < 2) throw new Error("Invalid token format");
            firebasePayload = JSON.parse(atob(parts[1]));
        } catch (e) {
            return error(401, 'Failed to decode Firebase ID Token');
        }

        const uid = firebasePayload.user_id || firebasePayload.sub || `test-uid-${Math.floor(Math.random() * 1000)}`;
        const phone = firebasePayload.phone_number || '+8800000000000';

        if (!uid) return error(401, 'Invalid Firebase ID Token: Missing UID');

        // Fetch or Create Farmer in D1 Database
        const selectQuery = `SELECT * FROM farmers WHERE phone_number = ? OR firebase_uid = ? LIMIT 1`;
        let user = await env.DB.prepare(selectQuery).bind(phone, uid).first();

        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            let displayName = name || 'Krishok' + uid.substring(0, 5);
            let pinHash = pin ? 'mock-hash-' + pin : null;

            const insertQuery = `
                INSERT INTO farmers (firebase_uid, phone_number, full_name, pin_hash) 
                VALUES (?, ?, ?, ?) RETURNING id;
            `;
            const result = await env.DB.prepare(insertQuery).bind(uid, phone, displayName, pinHash).first();
            user = { id: result.id, firebase_uid: uid, phone_number: phone, full_name: displayName };
        } else if (user.firebase_uid !== uid) {
             await env.DB.prepare(`UPDATE farmers SET firebase_uid = ? WHERE id = ?`).bind(uid, user.id).run();
             user.firebase_uid = uid;
        }

        const customToken = await signJWT({
            id: user.id,
            phone: user.phone_number,
            role: 'farmer'
        }, env.JWT_SECRET || 'fallback-secret');

        const needsProfileCompletion = isNewUser || !user.pin_hash || user.full_name.startsWith('Krishok');

        return json({
            success: true,
            isNewUser,
            needsProfileCompletion,
            token: customToken,
            user: { id: user.id, name: user.full_name, phone: user.phone_number }
        });

    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

export const getProfile = async (request, env) => {
    try {
        const query = `SELECT * FROM farmers WHERE id = ?`;
        const user = await env.DB.prepare(query).bind(request.user.id).first();
        if(!user) return error(404, 'User not found');

        // Dynamically fetch package details
        const packageName = user.subscription_status === 'pro' ? 'AgriTech Pro' : 'AgriTech Free';
        const pkgQuery = `SELECT * FROM subscription_packages WHERE name = ? LIMIT 1`;
        let pkg = await env.DB.prepare(pkgQuery).bind(packageName).first();
        
        if (!pkg) {
            pkg = { scan_limit: 3, timeline_limit: 5, chat_limit: 15 };
        }

        const formatLimit = (limit) => limit === 0 ? 'unlimited' : limit;

        // Check for pending payments
        const pendingQuery = `SELECT id FROM subscription_payments WHERE farmer_id = ? AND status = 'pending' LIMIT 1`;
        const pendingPayment = await env.DB.prepare(pendingQuery).bind(request.user.id).first();

        // Count user's total properties / farms
        const farmQuery = `SELECT COUNT(*) as count FROM farms WHERE farmer_id = ?`;
        const farmResult = await env.DB.prepare(farmQuery).bind(request.user.id).first();
        const totalLandsCount = farmResult ? farmResult.count : 0;

        return json({
            success: true,
            farmer: {
                id: user.id,
                name: user.full_name,
                phone: user.phone_number,
                address: user.address,
                subscription_level: user.subscription_status || 'free',
                total_lands: totalLandsCount,
                subscription_expiry: user.subscription_expiry,
                ai_scan_count: user.remaining_scans,
                ai_scan_limit: formatLimit(pkg.scan_limit),
                ai_timeline_count: user.remaining_timelines,
                ai_timeline_limit: formatLimit(pkg.timeline_limit),
                ai_chat_count: user.remaining_chats,
                ai_chat_limit: formatLimit(pkg.chat_limit),
                pkg_duration_months: pkg.duration_months || 0,
                pkg_duration_days: pkg.duration_days || 0,
                has_pending_payment: !!pendingPayment
            }
        });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

export const updateProfile = async (request, env) => {
    try {
        const { name, pin, address } = await request.json();

        if (!name) {
            return error(400, 'Name is required.');
        }

        let updateQuery;
        let params;

        if (pin && pin.length >= 4) {
            const pinHash = await bcrypt.hash(pin, 10);
            updateQuery = `
                UPDATE farmers 
                SET full_name = ?, address = ?, pin_hash = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            params = [name, address || null, pinHash, request.user.id];
        } else {
            updateQuery = `
                UPDATE farmers 
                SET full_name = ?, address = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            params = [name, address || null, request.user.id];
        }

        await env.DB.prepare(updateQuery).bind(...params).run();

        const fetchQuery = `SELECT * FROM farmers WHERE id = ?`;
        const updatedUser = await env.DB.prepare(fetchQuery).bind(request.user.id).first();

        return json({
            success: true,
            message: 'Profile updated successfully',
            user: { id: updatedUser.id, name: updatedUser.full_name, phone: updatedUser.phone_number, address: updatedUser.address }
        });

    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

// --- NEW PIN LOGIN LOGIC ---

export const checkUser = async (request, env) => {
    try {
        const { phone } = await request.json();
        if (!phone) return error(400, 'Phone number is required');

        const query = `SELECT id, pin_hash FROM farmers WHERE phone_number = ?`;
        const user = await env.DB.prepare(query).bind(phone).first();

        if (!user) {
            return json({ exists: false, hasPin: false });
        }

        return json({ exists: true, hasPin: !!user.pin_hash });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
}

export const loginPin = async (request, env) => {
    try {
        const { phone, pin } = await request.json();
        if (!phone || !pin) return error(400, 'Phone and PIN required');

        const query = `SELECT * FROM farmers WHERE phone_number = ?`;
        const user = await env.DB.prepare(query).bind(phone).first();

        if (!user || !user.pin_hash) {
            return error(401, 'User not found or no PIN set');
        }

        const isValid = await bcrypt.compare(pin, user.pin_hash);
        if (!isValid) return error(401, 'Incorrect PIN');

        const customToken = await signJWT({
            id: user.id,
            phone: user.phone_number,
            role: 'farmer'
        }, env.JWT_SECRET || 'fallback-secret');

        // Treat PIN login the same as OTP verify success
        return json({
            success: true,
            isNewUser: false,
            needsProfileCompletion: false, // Assumed false since they needed a PIN to log in
            token: customToken,
            user: { id: user.id, name: user.full_name, phone: user.phone_number }
        });

    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
}

export const submitManualPayment = async (request, env) => {
    try {
        const { payment_method, trx_id, amount_paid } = await request.json();
        const farmer_id = request.user.id;

        if (!payment_method || !trx_id || !amount_paid) {
            return error(400, 'All payment fields are required');
        }

        // Check if there's already a pending payment
        const existingQuery = `SELECT id FROM subscription_payments WHERE farmer_id = ? AND status = 'pending'`;
        const existing = await env.DB.prepare(existingQuery).bind(farmer_id).first();
        if (existing) {
            return error(400, 'আপনার ইতিমধ্যে একটি পেন্ডিং পেমেন্ট রিকোয়েস্ট আছে। দয়া করে অপেক্ষা করুন।');
        }

        // Get Pro package ID
        const pkg = await env.DB.prepare(`SELECT id FROM subscription_packages WHERE name = 'AgriTech Pro' LIMIT 1`).first();
        const package_id = pkg ? pkg.id : 2;

        const insertQuery = `
            INSERT INTO subscription_payments (farmer_id, package_id, amount_paid, payment_method, trx_id, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `;
        
        await env.DB.prepare(insertQuery).bind(farmer_id, package_id, parseInt(amount_paid, 10), payment_method, trx_id).run();

        return json({ success: true, message: 'পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে। অ্যাডমিন ভেরিফাই করে সাবস্ক্রিপশন চালু করবে।' });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
}
