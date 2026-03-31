import { Router, error } from 'itty-router';
import { withAuth } from './utils.js';

// Import Route Handlers
import { adminLogin, adminDashboard } from './routes/admin.js';
import { getMasterCrops, addMasterCrop, editMasterCrop, deleteMasterCrop, addBulkMasterCrops, updateCropStatus, syncCropFromCache, getCropRagContext, generateMissingRag } from './routes/admin_crops.js';
import { getAdminCache, saveAdminCache, deleteAdminCache, generateAdminCacheAI } from './routes/admin_cache.js';
import { getAdminSettings, saveAdminSettings } from './routes/admin_settings.js';
import { verifyFirebase, updateProfile, checkUser, loginPin } from './routes/auth.js';
import { createFarm, getFarms, getFarmDetails, updateFarm, deleteFarm } from './routes/farms.js';
import { saveCropTimeline, searchCrops, updateCropState, deleteCrop, completeCrop, updateCropStatusManually, addCropNote } from './routes/crops.js';
import { predictCrop, suggestCrop } from './routes/crop_ai.js';
import { analyzePublicCropImage, getPublicScanLogs } from './routes/public_crop_doctor.js';
import { getScanLogs, updateDiagnosticRules, getDiagnosticRules } from './routes/admin_crop_doctor.js';
import { runCropVerification } from './cron_verification.js';
import { aiRouter } from './routes/ai_engine/index.js';
import { handleCropChat } from './routes/ai_chat.js';
import { getTransactions, addTransaction, deleteTransaction } from './routes/transactions.js';
import { generateCropReport } from './services/pdfReportGenerator.js';
import { checkOverdueTasks } from './services/taskChecker.js';
import { syncWeatherData, testWeatherSync } from './services/weatherSync.js';
import { cleanOldCropScanImages } from './services/r2_cleaner.js';

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
router.put('/api/admin/crops/verify-from-cache/:id', withAuth(['admin']), syncCropFromCache);
router.put('/api/admin/crops/:id/status', withAuth(['admin']), updateCropStatus);
router.delete('/api/admin/crops/:id', withAuth(['admin']), deleteMasterCrop);
router.get('/api/admin/crops/rag-context', withAuth(['admin']), getCropRagContext);
router.post('/api/admin/crops/:id/generate-rag', withAuth(['admin']), generateMissingRag);
router.get('/api/admin/settings', withAuth(['admin']), getAdminSettings);
router.post('/api/admin/settings', withAuth(['admin']), saveAdminSettings);
router.get('/api/admin/test/weather-sync', withAuth(['admin']), testWeatherSync);
router.post('/api/admin/trigger-ai-verification', withAuth(['admin']), async (request, env, ctx) => {
    try {
        let cropId = null;
        try {
            const body = await request.json();
            cropId = body.cropId || null;
        } catch(e) {} // ignore empty bodies
        
        const stats = await runCropVerification(env, cropId, ctx);
        return Response.json({ success: true, message: 'AI Verification cycle executed successfully.', details: stats });
    } catch(e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
});

// 2.5 Admin Cache Routes
router.get('/api/admin/cache', withAuth(['admin']), getAdminCache);
router.post('/api/admin/cache', withAuth(['admin']), saveAdminCache);
router.delete('/api/admin/cache', withAuth(['admin']), deleteAdminCache);
router.post('/api/admin/cache/generate', withAuth(['admin']), generateAdminCacheAI);

// 2.6 Admin Crop Doctor Routes
router.get('/api/admin/crop-doctor/scans', withAuth(['admin']), getScanLogs);
router.get('/api/admin/crop-doctor/rules', withAuth(['admin']), getDiagnosticRules);
router.post('/api/admin/crop-doctor/rules', withAuth(['admin']), updateDiagnosticRules);

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
router.post('/api/public/crop-scan', withAuth(['farmer', 'admin']), analyzePublicCropImage);
router.get('/api/public/crop-scans', withAuth(['farmer']), getPublicScanLogs);
router.post('/api/public/crop-chat', withAuth(['farmer', 'admin']), handleCropChat);

// 3.7 Public Image Server (R2 Bucket)
router.get('/api/public/images/:key', async (request, env) => {
    try {
        const { key } = request.params;
        const object = await env.IMAGE_BUCKET.get(`crop-scans/${key}`);
        if (!object) return new Response('Image Not Found', { status: 404 });
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        return new Response(object.body, { headers });
    } catch(err) {
        return new Response('Error fetching image', { status: 500 });
    }
});
router.get('/api/public/cache', withAuth(['farmer']), getAdminCache);
router.get('/api/ai/suggest-crop', withAuth(['farmer']), suggestCrop);
router.get('/api/ai/predict-crop', withAuth(['farmer']), predictCrop);
router.get('/api/crops/search', withAuth(['farmer']), searchCrops);
router.post('/api/crops', withAuth(['farmer']), saveCropTimeline);
router.put('/api/crops/:id/state', withAuth(['farmer']), updateCropState);
router.delete('/api/crops/:id', withAuth(['farmer']), deleteCrop);
router.put('/api/crops/:id/complete', withAuth(['farmer']), completeCrop);
router.put('/api/crops/:id/status', withAuth(['farmer']), updateCropStatusManually);
router.post('/api/crops/:id/notes', withAuth(['farmer']), addCropNote);
router.get('/api/crops/:id/report', withAuth(['farmer']), generateCropReport);
router.get('/api/crops/:id/transactions', withAuth(['farmer']), getTransactions);
router.post('/api/crops/:id/transactions', withAuth(['farmer']), addTransaction);
router.delete('/api/crops/:id/transactions/:txId', withAuth(['farmer']), deleteTransaction);

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
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-user',
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
        ctx.waitUntil(Promise.allSettled([
            runCropVerification(env),
            checkOverdueTasks(env),
            syncWeatherData(env),
            cleanOldCropScanImages(env)
        ]));
    }
};
