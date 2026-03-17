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

export const updateProfile = async (request, env) => {
    try {
        const { name, pin } = await request.json();

        if (!name || !pin || pin.length < 4) {
            return error(400, 'Valid Name and a PIN are required.');
        }

        const pinHash = await bcrypt.hash(pin, 10);

        const updateQuery = `
            UPDATE farmers 
            SET full_name = ?, pin_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await env.DB.prepare(updateQuery).bind(name, pinHash, request.user.id).run();

        const fetchQuery = `SELECT * FROM farmers WHERE id = ?`;
        const updatedUser = await env.DB.prepare(fetchQuery).bind(request.user.id).first();

        return json({
            success: true,
            message: 'Profile updated successfully',
            user: { id: updatedUser.id, name: updatedUser.full_name, phone: updatedUser.phone_number }
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
