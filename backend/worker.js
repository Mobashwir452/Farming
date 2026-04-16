import { Router, error } from 'itty-router';
import { withAuth } from './utils.js';

// Import Route Handlers
import { adminLogin, adminDashboard } from './routes/admin.js';
import { getMasterCrops, addMasterCrop, editMasterCrop, deleteMasterCrop, addBulkMasterCrops, updateCropStatus, syncCropFromCache, getCropRagContext, generateMissingRag } from './routes/admin_crops.js';
import { getAdminCache, saveAdminCache, deleteAdminCache, generateAdminCacheAI } from './routes/admin_cache.js';
import { getAdminSettings, saveAdminSettings } from './routes/admin_settings.js';
import { verifyFirebase, updateProfile, checkUser, loginPin, getProfile, submitManualPayment } from './routes/auth.js';
import { createFarm, getFarms, getFarmDetails, updateFarm, deleteFarm } from './routes/farms.js';
import { saveCropTimeline, searchCrops, getCropById, updateCropState, deleteCrop, completeCrop, updateCropStatusManually, addCropNote } from './routes/crops.js';
import { predictCrop, suggestCrop } from './routes/crop_ai.js';
import { analyzePublicCropImage, getPublicScanLogs } from './routes/public_crop_doctor.js';
import { getScanLogs, updateDiagnosticRules, getDiagnosticRules } from './routes/admin_crop_doctor.js';
import { getUsers, getUserDetails, toggleUserStatus, clearUserPin, getUserTransactions, getAdminFarmDetails } from './routes/admin_users.js';
import { getPackages, updatePackage, addPackage, deletePackage, getActiveSubscribers, getPaymentHistory, manualUpgrade, getPaymentSettings, updatePaymentSettings, getPendingPayments, approvePayment, rejectPayment, downgradeUser } from './routes/admin_subscriptions.js';
import { runCropVerification } from './cron_verification.js';
import { aiRouter } from './routes/ai_engine/index.js';
import { handleCropChat } from './routes/ai_chat.js';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from './routes/transactions.js';
import { getPlantGrid, generatePlantGrid, updateBedConfig, getPlantLogs, addPlantLog, uploadPlantImage, syncCropBeds } from './routes/plants.js';
import { generateCropReport } from './services/pdfReportGenerator.js';
import { checkOverdueTasks } from './services/taskChecker.js';
import { syncWeatherData, testWeatherSync } from './services/weatherSync.js';
import { cleanOldCropScanImages } from './services/r2_cleaner.js';
import { resetMonthlyLimits } from './services/limitResetter.js';
import { compressUncompressedImages, findOrphanImages, deleteOrphanImages } from './routes/admin_dbtools.js';
import { checkAndSendPlantReminders } from './services/statusReminderService.js';


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
router.post('/api/admin/dbtools/compress-images', withAuth(['admin']), compressUncompressedImages);
router.get('/api/admin/dbtools/find-orphans', withAuth(['admin']), findOrphanImages);
router.post('/api/admin/dbtools/delete-orphans', withAuth(['admin']), deleteOrphanImages);

// Admin Users & Subscriptions
router.get('/api/admin/users', withAuth(['admin']), getUsers);
router.get('/api/admin/users/:id/details', withAuth(['admin']), getUserDetails);
router.get('/api/admin/users/:id/transactions', withAuth(['admin']), getUserTransactions);
router.get('/api/admin/users/:id/farms/:farmId', withAuth(['admin']), getAdminFarmDetails);
router.put('/api/admin/users/:id/status', withAuth(['admin']), toggleUserStatus);
router.post('/api/admin/users/:id/clear-pin', withAuth(['admin']), clearUserPin);
router.get('/api/admin/packages', withAuth(['admin']), getPackages);
router.post('/api/admin/packages', withAuth(['admin']), addPackage);
router.put('/api/admin/packages/:id', withAuth(['admin']), updatePackage);
router.delete('/api/admin/packages/:id', withAuth(['admin']), deletePackage);
router.get('/api/admin/subscriptions/active-users', withAuth(['admin']), getActiveSubscribers);
router.get('/api/admin/subscriptions/history', withAuth(['admin']), getPaymentHistory);
router.post('/api/admin/subscriptions/manual-upgrade', withAuth(['admin']), manualUpgrade);
router.post('/api/admin/subscriptions/downgrade/:id', withAuth(['admin']), downgradeUser);
router.get('/api/admin/subscriptions/pending', withAuth(['admin']), getPendingPayments);
router.post('/api/admin/subscriptions/approve/:id', withAuth(['admin']), approvePayment);
router.post('/api/admin/subscriptions/reject/:id', withAuth(['admin']), rejectPayment);
router.get('/api/admin/payment-settings', withAuth(['admin']), getPaymentSettings);
router.post('/api/admin/payment-settings', withAuth(['admin']), updatePaymentSettings);
router.get('/api/payment-settings', getPaymentSettings); // Public equivalent for farmer app

router.post('/api/admin/trigger-ai-verification', withAuth(['admin']), async (request, env, ctx) => {
    try {
        let cropId = null;
        try {
            const body = await request.json();
            cropId = body.cropId || null;
        } catch (e) { } // ignore empty bodies

        const stats = await runCropVerification(env, cropId, ctx);
        return Response.json({ success: true, message: 'AI Verification cycle executed successfully.', details: stats });
    } catch (e) {
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
router.get('/api/auth/profile', withAuth(['farmer']), getProfile);
router.put('/api/auth/profile', withAuth(['farmer']), updateProfile);
router.post('/api/auth/submit-payment', withAuth(['farmer']), submitManualPayment);

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
router.get('/api/public/images/*', async (request, env) => {
    try {
        const url = new URL(request.url);
        let key = url.pathname.replace('/api/public/images/', '');
        key = decodeURIComponent(key);
        // Fallback for older crop-scans images that just have standard uuids without prefixes
        if (!key.includes('/')) {
            key = `crop-scans/${key}`;
        }

        const object = await env.IMAGE_BUCKET.get(key);
        if (!object) return new Response('Image Not Found', { status: 404 });
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        // Important for CORS:
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(object.body, { headers });
    } catch (err) {
        return new Response('Error fetching image', { status: 500 });
    }
});
router.get('/api/public/cache', withAuth(['farmer']), getAdminCache);
router.get('/api/ai/suggest-crop', withAuth(['farmer']), suggestCrop);
router.get('/api/ai/predict-crop', withAuth(['farmer']), predictCrop);
router.get('/api/crops/search', withAuth(['farmer']), searchCrops);
router.get('/api/crops/:id', withAuth(['farmer']), getCropById);

router.post('/api/crops', withAuth(['farmer']), saveCropTimeline);
router.put('/api/crops/:id/state', withAuth(['farmer']), updateCropState);
router.delete('/api/crops/:id', withAuth(['farmer']), deleteCrop);
router.put('/api/crops/:id/complete', withAuth(['farmer']), completeCrop);
router.put('/api/crops/:id/status', withAuth(['farmer']), updateCropStatusManually);
router.post('/api/crops/:id/notes', withAuth(['farmer']), addCropNote);
router.get('/api/crops/:id/report', withAuth(['farmer']), generateCropReport);
router.get('/api/crops/:id/transactions', withAuth(['farmer']), getTransactions);
router.post('/api/crops/:id/transactions', withAuth(['farmer']), addTransaction);
router.put('/api/crops/:id/transactions/:txId', withAuth(['farmer']), updateTransaction);
router.delete('/api/crops/:id/transactions/:txId', withAuth(['farmer']), deleteTransaction);

// 3.8 Plant Tracking 3D Grids & Logs
router.post('/api/crops/:id/upload-image', withAuth(['farmer']), uploadPlantImage);
router.get('/api/crops/:id/plants', withAuth(['farmer']), getPlantGrid);
router.post('/api/crops/:id/plants/generate', withAuth(['farmer']), generatePlantGrid);
router.put('/api/crops/:id/beds/:bedId', withAuth(['farmer']), updateBedConfig);
router.put('/api/crops/:id/beds-sync', withAuth(['farmer']), syncCropBeds);
router.get('/api/crops/beds/:bedId/plants/:plantIdentifier/logs', withAuth(['farmer']), getPlantLogs);
router.post('/api/crops/beds/:bedId/plants/:plantIdentifier/logs', withAuth(['farmer']), addPlantLog);

// 3.9 Testing Route for Reminders!
router.get('/api/test-reminders', async (request, env) => {
    const isForce = new URL(request.url).searchParams.get('force') === 'true';
    const result = await checkAndSendPlantReminders(env, isForce);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
});

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
            cleanOldCropScanImages(env),
            resetMonthlyLimits(env),
            checkAndSendPlantReminders(env)
        ]));
    }
};
