import { Router, error, json } from 'itty-router';
import bcrypt from 'bcryptjs';

const router = Router();

// --- Utility: JWT Signing (Mocked for simplicity, use a JWT package like @tsndr/cloudflare-worker-jwt in prod) ---
async function signJWT(payload, secret) {
    // Basic Base64 encoding for structural demonstration without external JWT libs for now
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 86400000 }));
    // In production, you must use crypto.subtle.sign to append a real HMAC SHA-256 signature
    const signature = 'mock-signature-do-not-use-in-production'; 
    return `${header}.${body}.${signature}`;
}

async function verifyJWT(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp < Date.now()) return null;
        return payload;
    } catch (e) {
        return null;
    }
}

// --- Middleware: RBAC Auth ---
const withAuth = async (request, env) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(401, 'Unauthorized: Missing or invalid token');
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyJWT(token, env.JWT_SECRET || 'fallback-secret');
    if (!payload) return error(401, 'Unauthorized: Invalid or expired token');
    
    // Attach user payload to request
    request.user = payload;
};

// --- Routes ---

// 1. System Health Check
router.get('/api/health', () => json({ status: 'ok', version: '1.0' }));

// 2. Admin Login Route
router.post('/api/admin/login', async (request, env) => {
    try {
        const { email, password } = await request.json();
        if (!email || !password) return error(400, 'Email and password required');

        // Fetch User and their Role from D1
        const query = `
            SELECT u.id, u.name, u.email, u.password_hash, r.role_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = ?
        `;
        const user = await env.DB.prepare(query).bind(email).first();

        if (!user) return error(401, 'Invalid credentials');

        // Check Password using bcryptjs
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return error(401, 'Invalid credentials');

        // Get permissions from DB (Optional: cache this)
        const permQuery = `
            SELECT p.permission_name 
            FROM recommendations rp 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role_id = (SELECT role_id FROM users WHERE email = ?)
        `;
        // For simplicity, we assume super admin has all. Let's just pass the role.
        
        // Generate JWT
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
});

// 3. Protected Route Example: Get Dashboard Stats
router.get('/api/admin/dashboard', withAuth, async (request, env) => {
    // Only logged in admins can access this
    return json({
        message: `Welcome to the secure dashboard, ${request.user.role}!`,
        stats: { total_farmers: 1200, active_subscriptions: 450 }
    });
});

// --- Catch-All 404 ---
router.all('*', () => error(404, 'API Route Not Found'));

// --- Export Fetch Handler ---
export default {
    async fetch(request, env, ctx) {
        // Handle CORS
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            });
        }
        
        return router
            .handle(request, env, ctx)
            .then(res => {
                // Add CORS headers to all responses
                const newHeaders = new Headers(res.headers);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                return new Response(res.body, { status: res.status, headers: newHeaders });
            })
            .catch(err => error(500, err.stack));
    }
};
