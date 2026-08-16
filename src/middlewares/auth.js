// src/middlewares/auth.js
import crypto from 'crypto';
import { AppError } from '../utils/AppError.js';

// Hash the valid API key once at startup so it is always 32 bytes
const validKeyHash = crypto.createHash('sha256').update(process.env.API_KEY).digest();

export const requireApiKey = (req, res, next) => {
  const incomingKey = req.headers['x-api-key'];

  if (!incomingKey) {
    return next(new AppError(401, 'API key is required', 'UNAUTHORIZED'));
  }

  // Hash the incoming key
  const incomingKeyHash = crypto.createHash('sha256').update(incomingKey).digest();

  // Compare the hashes safely
  // timingSafeEqual returns true if they match, throws an error if lengths differ (impossible here due to SHA256)
  if (crypto.timingSafeEqual(validKeyHash, incomingKeyHash)) {
    return next(); // Key is valid, proceed
  }

  return next(new AppError(403, 'Invalid API key', 'FORBIDDEN'));
};