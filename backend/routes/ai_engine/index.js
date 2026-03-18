import { Router } from 'itty-router';
import { withAuth } from '../../utils.js';

import { getAiStats } from './ai_overview.js';
import { getPredictionRules, savePredictionRules } from './ai_prediction.js';
import { getDoctorRules, saveDoctorRules } from './ai_doctor.js';
import { getAiConfig, saveAiConfig } from './ai_config.js';
import { uploadKnowledge, getKnowledgeDocuments } from './ai_rag.js';
import { getAiLogs } from './ai_logs.js';

export const aiRouter = Router({ base: '/api/admin/ai' });

// Apply admin authentication middleware to all AI routes
aiRouter.all('*', withAuth(['admin']));

// Tab 1: Overview
aiRouter.get('/stats', getAiStats);

// Tab 2: Prediction
aiRouter.get('/prediction-rules', getPredictionRules);
aiRouter.post('/prediction-rules', savePredictionRules);

// Tab 3: Doctor
aiRouter.get('/doctor-rules', getDoctorRules);
aiRouter.post('/doctor-rules', saveDoctorRules);

// Tab 4: Config
aiRouter.get('/config', getAiConfig);
aiRouter.post('/config', saveAiConfig);

// Tab 5: RAG
aiRouter.post('/rag/upload', uploadKnowledge);
aiRouter.get('/rag/documents', getKnowledgeDocuments);

// Tab 6: Logs
aiRouter.get('/logs', getAiLogs);
