import { Router, error } from 'itty-router';
import { withAuth } from './utils.js';

// Import Route Handlers
import { adminLogin, adminDashboard } from './routes/admin.js';
import { verifyFirebase, updateProfile, checkUser, loginPin } from './routes/auth.js';

const router = Router();

// 1. System Health Check
router.get('/api/health', () => Response.json({ status: 'ok', version: '1.0' }));

// 2. Admin Routes
router.post('/api/admin/login', adminLogin);
router.get('/api/admin/dashboard', withAuth(['admin']), adminDashboard);

// 3. Public Auth Routes (Farmers)
router.post('/api/auth/verify-firebase', verifyFirebase);
router.post('/api/auth/check-user', checkUser);
router.post('/api/auth/login-pin', loginPin);
router.put('/api/auth/profile', withAuth(['farmer']), updateProfile);

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
