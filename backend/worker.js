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
// Modified to support checking multiple roles (e.g., allow both 'admin' and 'farmer' or just one)
const withAuth = (allowedRoles = []) => async (request, env) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(401, 'Unauthorized: Missing or invalid token');
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyJWT(token, env.JWT_SECRET || 'fallback-secret');
    if (!payload) return error(401, 'Unauthorized: Invalid or expired token');
    
    // Role Authorization
    if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        // Fallback check for admin level roles just in case
        if (!allowedRoles.includes('admin') || payload.role !== 'Super Admin') {
            return error(403, 'Forbidden: Insufficient permissions');
        }
    }

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

// 3. Protected Route Example: Admin Dashboard Stats
router.get('/api/admin/dashboard', withAuth(['admin']), async (request, env) => {
    // Only logged in admins can access this
    return json({
        message: `Welcome to the secure dashboard, ${request.user.role}!`,
        stats: { total_farmers: 1200, active_subscriptions: 450 }
    });
});

// 4. Public Web App: Firebase Phone Auth Verification
router.post('/api/auth/verify-firebase', async (request, env) => {
    try {
        const { idToken, name, pin } = await request.json();
        if (!idToken) return error(400, 'Missing Firebase ID Token');

        // --- Mock Firebase JWT Verification ---
        // In production, use standard JWT decoding methods against Google's public certs
        // Usually, the Firebase Auth token is structured as a JWT where the body contains:
        // { "user_id": "ABC123UID", "phone_number": "+88017XXX..." }
        
        let firebasePayload;
        try {
            const parts = idToken.split('.');
            if(parts.length < 2) throw new Error("Invalid token format");
             firebasePayload = JSON.parse(atob(parts[1]));
        } catch(e) {
             return error(401, 'Failed to decode Firebase ID Token');
        }
        
        const uid = firebasePayload.user_id || firebasePayload.sub;
        const phone = firebasePayload.phone_number || '';
        if (!uid) return error(401, 'Invalid Firebase ID Token: Missing UID');

        // Note: For a real app, also conditionally verify Cloudflare Turnstile token here
        // if (request.turnstileToken) { /* fetch siteverify */ }

        // Fetch or Create Farmer in D1 Database
        const selectQuery = `SELECT * FROM farmers WHERE firebase_uid = ?`;
        let user = await env.DB.prepare(selectQuery).bind(uid).first();

        let isNewUser = false;

        if (!user) {
            // New Registration
            isNewUser = true;
            // Prevent empty fallback
            let displayName = name || 'Krishok' + uid.substring(0, 5); 
            // In real app, hash the PIN if provided
            let pinHash = pin ? 'mock-hash-' + pin : null; 
            
            // Insert new user
            const insertQuery = `
                INSERT INTO farmers (firebase_uid, phone_number, full_name, pin_hash) 
                VALUES (?, ?, ?, ?) RETURNING id;
            `;
            const result = await env.DB.prepare(insertQuery).bind(uid, phone, displayName, pinHash).first();
            
            user = { id: result.id, firebase_uid: uid, phone_number: phone, full_name: displayName };
        }

        // Generate Custom Internal JWT
        // The role 'farmer' distinguishes them from 'Super Admin'
        const customToken = await signJWT({
            id: user.id,
            phone: user.phone_number,
            role: 'farmer'
        }, env.JWT_SECRET || 'fallback-secret');

        return json({
            success: true,
            isNewUser,
            token: customToken,
            user: { id: user.id, name: user.full_name, phone: user.phone_number }
        });

    } catch (err) {
        return error(500, 'Server Error: ' + err.message);
    }
});

// 5. Protected Route Example: Farmer Dashboard Stats
router.get('/api/farmer/profile', withAuth(['farmer', 'admin']), async (request, env) => {
    // Both farmers and admins can access this type of route
    return json({
        message: `Hello ${request.user.phone}, your profile is secure.`,
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
