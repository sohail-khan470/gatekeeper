// src/app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './utils/logger.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { requireApiKey } from './middlewares/auth.js';
import messageRoutes from './routes/messageRoutes.js';

const app = express();

// --- SECURITY MIDDLEWARE ---
app.use(helmet()); // Secures HTTP headers

// Configure CORS to only allow our future React app
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Idempotency-Key'],
  exposedHeaders: ['RateLimit-Remaining', 'RateLimit-Limit', 'Retry-After']
}));

// --- PARSING ---
app.use(express.json());

// --- ROUTES ---
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

// Apply API key auth to all /api routes
app.use('/api', requireApiKey);

// Mount our message routes
app.use('/api/messages', messageRoutes);

// --- ERROR HANDLING ---
app.use(notFound);
app.use(errorHandler);

export default app;