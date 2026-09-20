import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET || 'development-secret',

  // Gemini
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',

  systemPrompt:
    process.env.SYSTEM_PROMPT ||
    'You are a helpful AI assistant. Give accurate, clear and concise answers. Use Markdown when useful. Format programming code using fenced code blocks.',

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  rateLimitWindowMs:
    Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,

  rateLimitMaxRequests:
    Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  loginRateLimitMaxRequests:
    Number(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS) || 10,

  registerRateLimitMaxRequests:
    Number(process.env.REGISTER_RATE_LIMIT_MAX_REQUESTS) || 10,

  aiRateLimitMaxRequests:
    Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS) || 20,
};