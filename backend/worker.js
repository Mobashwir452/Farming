import { Router, error } from 'itty-router';
import { withAuth } from './utils.js';

// Import Route Handlers
import { adminLogin, adminDashboard } from './routes/admin.js';
import { getMasterCrops, addMasterCrop, editMasterCrop, deleteMasterCrop, addBulkMasterCrops, updateCropStatus } from './routes/admin_crops.js';
import { getAdminCache, saveAdminCache, deleteAdminCache, generateAdminCacheAI } from './routes/admin_cache.js';
import { verifyFirebase, updateProfile, checkUser, loginPin } from './routes/auth.js';
import { createFarm, getFarms, getFarmDetails, updateFarm, deleteFarm } from './routes/farms.js';
import { saveCropTimeline, searchCrops, updateCropState } from './routes/crops.js';
import { predictCrop, suggestCrop } from './routes/crop_ai.js';
import { runCropVerification } from './cron_verification.js';
import { aiRouter } from './routes/ai_engine/index.js';

const router = Router();

// 1. System Health Check
router.get('/api/health', () => Response.json({ status: 'ok', version: '1.0' }));

// 2. Admin Routes
router.post('/api/admin/login', adminLogin);
router.get('/api/admin/dashboard', withAuth(['admin']), adminDashboard);
router.get('/api/admin/crops', withAuth(['admin']), getMasterCrops);
router.post('/api/admin/crops/bulk', withAuth(['admin']), addBulkMasterCrops);
router.post('/api/admin/crops', withAuth(['admin']), addMasterCrop);
router.put('/api/admin/crops/:id', withAuth(['admin']), editMasterCrop);
router.put('/api/admin/crops/:id/status', withAuth(['admin']), updateCropStatus);
router.delete('/api/admin/crops/:id', withAuth(['admin']), deleteMasterCrop);

// 2.5 Admin Cache Routes
router.get('/api/admin/cache', withAuth(['admin']), getAdminCache);
router.post('/api/admin/cache', withAuth(['admin']), saveAdminCache);
router.delete('/api/admin/cache', withAuth(['admin']), deleteAdminCache);
router.post('/api/admin/cache/generate', withAuth(['admin']), generateAdminCacheAI);

// 3. Public Auth Routes (Farmers)
router.post('/api/auth/verify-firebase', verifyFirebase);
router.post('/api/auth/check-user', checkUser);
router.post('/api/auth/login-pin', loginPin);
router.put('/api/auth/profile', withAuth(['farmer']), updateProfile);

// 3.5. Public Farm & Land Routes (Farmers only)
router.post('/api/farms', withAuth(['farmer']), createFarm);
router.get('/api/farms', withAuth(['farmer']), getFarms);
router.get('/api/farms/:id', withAuth(['farmer']), getFarmDetails);
router.put('/api/farms/:id', withAuth(['farmer']), updateFarm);
router.delete('/api/farms/:id', withAuth(['farmer']), deleteFarm);

// 3.6 Public Crop AI & Timeline Routes
router.get('/api/ai/suggest-crop', withAuth(['farmer']), suggestCrop);
router.get('/api/ai/predict-crop', withAuth(['farmer']), predictCrop);
router.get('/api/crops/search', withAuth(['farmer']), searchCrops);
router.post('/api/crops', withAuth(['farmer']), saveCropTimeline);
router.put('/api/crops/:id/state', withAuth(['farmer']), updateCropState);

// 4. AI Engine Sub-Router (Admin Only - auth handled in sub-router)
router.all('/api/admin/ai/*', aiRouter.handle);

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
                // Add CORS and No-Cache headers to all responses
                const newHeaders = new Headers(res.headers);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                newHeaders.set('Pragma', 'no-cache');
                newHeaders.set('Expires', '0');

                return new Response(res.body, { status: res.status, headers: newHeaders });
            })
            .catch(err => error(500, err.stack));
    },
    async scheduled(event, env, ctx) {
        // Triggered by Cloudflare Cron Trigger (e.g. daily at midnight)
        ctx.waitUntil(runCropVerification(env));
    }
};
