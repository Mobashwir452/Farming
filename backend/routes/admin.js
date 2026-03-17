import { error, json } from 'itty-router';
import bcrypt from 'bcryptjs';
import { signJWT } from '../utils.js';

export const adminLogin = async (request, env) => {
    try {
        const { email, password } = await request.json();
        if (!email || !password) return error(400, 'Email and password required');

        const query = `
            SELECT u.id, u.name, u.email, u.password_hash, r.role_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = ?
        `;
        const user = await env.DB.prepare(query).bind(email).first();

        if (!user) return error(401, 'Invalid credentials');

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return error(401, 'Invalid credentials');

        const token = await signJWT({
            id: user.id,
            email: user.email,
            role: user.role_name
        }, env.JWT_SECRET || 'fallback-secret');

        return json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role_name: user.role_name }
        });
    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
};

export const adminDashboard = async (request, env) => {
    return json({
        message: `Welcome to the secure dashboard, ${request.user.role}!`,
        stats: { total_farmers: 1200, active_subscriptions: 450 }
    });
};
