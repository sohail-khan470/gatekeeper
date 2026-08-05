// src/app.js
import express from 'express';
import { logger } from './utils/logger.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { validate } from './middlewares/validate.js';
import { createMessageSchema } from './validations/message.validation.js';
import messageRoutes from './routes/messageRoutes.js';
import requestTestMiddleware from './middlewares/req-test.middleware.js';

const app = express();

app.use(express.json());

// --- ROUTES ---

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.get('/test-request', requestTestMiddleware, (req, res) => {
  console.log(res.locals);
});

// New validated route
app.use('/api/messages', messageRoutes);

// --- ERROR HANDLING ---
app.use(notFound);
app.use(errorHandler);

export default app;
