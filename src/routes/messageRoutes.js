// src/routes/messageRoutes.js
import express from 'express';
import { messageController } from '../controllers/messageController.js';
import { validate } from '../middlewares/validate.js';
import { idempotency } from '../middlewares/idempotency.js';
import { rateLimiter } from '../middlewares/rateLimiter.js'; // New!
import { createMessageSchema, getMessagesSchema } from '../validations/message.validation.js';

const router = express.Router();

router.post(
  '/',
  rateLimiter,    // 1. Check rate limit first
  idempotency,    // 2. Check idempotency
  validate(createMessageSchema), 
  messageController.createMessage
);

router.get(
  '/',
  rateLimiter,    // 1. Check rate limit first
  validate(getMessagesSchema), 
  messageController.getMessages
);

export default router;