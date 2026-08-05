// src/routes/messageRoutes.js
import express from 'express';
import { messageController } from '../controllers/messageController.js';
import { validate } from '../middlewares/validate.js';
import { createMessageSchema, getMessageSchema } from '../validations/message.validation.js';

const router = express.Router();

// POST /api/messages
router.post(
  '/',
  validate(createMessageSchema), // 1. Validate
  messageController.createMessage // 2. Control
);

// GET /api/messages
// router.get(
//   '/',
//   messageController.getMessages // 1. Control (no validation needed for simple GET)
// );
// Apply validation to the GET route
router.get('/', validate(getMessageSchema), messageController.getMessages);

export default router;
