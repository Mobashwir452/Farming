import { Router } from 'itty-router';
import { withAuth } from '../../utils.js';

import { getAiStats } from './ai_overview.js';
import { getPredictionRules, savePredictionRules } from './ai_prediction.js';
import { getMasterCrops, postTestPrediction, deleteCache, getGlobalPrompt, setGlobalPrompt } from './ai_prediction_tester.js';
import { getApiKeys, addApiKeys, toggleApiKey, deleteApiKey } from './api_manager.js';
import { getDoctorRules, saveDoctorRules } from './ai_doctor.js';
import { getAiConfig, saveAiConfig, getAiPrompts, saveAiPrompt } from './ai_config.js';

import { uploadKnowledge, getKnowledgeDocuments } from './ai_rag.js';
import { getCfQuota } from './cf_telemetry.js';

export const aiRouter = Router({ base: '/api/admin/ai' });

// Apply admin authentication middleware to all AI routes
aiRouter.all('*', withAuth(['admin']));

// Tab 1: Overview
aiRouter.get('/stats', getAiStats);
aiRouter.get('/cf-quota', getCfQuota);

// Tab 2: Prediction
aiRouter.get('/prediction-rules', getPredictionRules);
aiRouter.post('/prediction-rules', savePredictionRules);
aiRouter.get('/master-crops', getMasterCrops);
aiRouter.post('/test-prediction', postTestPrediction);
aiRouter.delete('/cache/:cropId', deleteCache);

// Global Prompt Override
aiRouter.get('/settings/global-prompt', getGlobalPrompt);
aiRouter.post('/settings/global-prompt', setGlobalPrompt);

// API Keys Management
aiRouter.get('/api-keys', getApiKeys);
aiRouter.post('/api-keys', addApiKeys);
aiRouter.put('/api-keys/:id/toggle', toggleApiKey);
aiRouter.delete('/api-keys/:id', deleteApiKey);

// Tab 3: Doctor
aiRouter.get('/doctor-rules', getDoctorRules);
aiRouter.post('/doctor-rules', saveDoctorRules);

// Tab 4: Config
aiRouter.get('/config', getAiConfig);
aiRouter.post('/config', saveAiConfig);

// Prompt Studio
aiRouter.get('/prompts', getAiPrompts);
aiRouter.post('/prompts', saveAiPrompt);

// Tab 5: RAG
aiRouter.post('/rag/upload', uploadKnowledge);
aiRouter.get('/rag/documents', getKnowledgeDocuments);

// Tab 6: Logs
import { getAiLogs, getChatLogs, getMissedQueries } from './ai_logs.js';
aiRouter.get('/logs', getAiLogs);
aiRouter.get('/logs/chat', getChatLogs);
aiRouter.get('/logs/missed', getMissedQueries);
