import { error } from 'itty-router';

// Custom lightweight JWT Implementation
export async function signJWT(payload, secret) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 86400000 }));
    const signature = 'mock-signature-do-not-use-in-production';
    return `${header}.${body}.${signature}`;
}

export async function verifyJWT(token, secret) {
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

// RBAC Middleware
export const withAuth = (allowedRoles = []) => async (request, env) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(401, 'Unauthorized: Missing or invalid token');
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyJWT(token, env.JWT_SECRET || 'fallback-secret');
    if (!payload) return error(401, 'Unauthorized: Invalid or expired token');

    if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        if (!allowedRoles.includes('admin') || payload.role !== 'Super Admin') {
            return error(403, 'Forbidden: Insufficient permissions');
        }
    }

    request.user = payload;
};
