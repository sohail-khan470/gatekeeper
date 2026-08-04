// src/app.js
import express from 'express';
import { logger } from './utils/logger.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { validate } from './middlewares/validate.js';
import { createMessageSchema } from './validations/message.validation.js';

const app = express();

app.use(express.json());

// --- ROUTES ---

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

// New validated route
app.post('/api/messages', validate(createMessageSchema), (req, res) => {
  // If we reach here, the data is guaranteed to be valid!
  logger.info(`Received valid message from ${req.body.author}`);

  res.status(201).json({
    success: true,
    data: {
      message: 'Message created successfully',
      receivedContent: req.body.content,
    },
  });
});

// --- ERROR HANDLING ---
app.use(notFound);
app.use(errorHandler);

export default app;
