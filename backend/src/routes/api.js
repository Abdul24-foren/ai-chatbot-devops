import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { config } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { notFoundHandler, globalErrorHandler } from '../middleware/errorHandler.js';
import { register, login, logout, getCurrentUser } from '../controllers/authController.js';
import { createConversation, listConversations, searchConversations, getConversationById, updateConversation, deleteConversation, getConversationMessages, createMessage, regenerateMessage } from '../controllers/conversationController.js';

const router = express.Router();

router.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.loginRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please wait before trying again.' },
});

const registerLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.registerRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many registrations. Please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.aiRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many AI requests. Please slow down.' },
});

router.use(generalLimiter);

router.get('/', (req, res) => {
  res.json({ success: true, data: { message: 'AI Chatbot Platform API is running.' } });
});

router.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.post('/api/auth/register', registerLimiter, register);
router.post('/api/auth/login', loginLimiter, login);
router.post('/api/auth/logout', authenticate, logout);
router.get('/api/auth/me', authenticate, getCurrentUser);

router.post('/api/conversations', authenticate, createConversation);
router.get('/api/conversations', authenticate, listConversations);
router.get('/api/conversations/search', authenticate, searchConversations);
router.get('/api/conversations/:id', authenticate, getConversationById);
router.patch('/api/conversations/:id', authenticate, updateConversation);
router.delete('/api/conversations/:id', authenticate, deleteConversation);
router.get('/api/conversations/:id/messages', authenticate, getConversationMessages);
router.post('/api/conversations/:id/messages', authenticate, aiLimiter, createMessage);
router.post('/api/messages/:id/regenerate', authenticate, regenerateMessage);

router.use(notFoundHandler);
router.use(globalErrorHandler);

export default router;
