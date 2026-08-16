// src/middlewares/rateLimiter.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { redis } from '../config/redisClient.js';
import { AppError } from '../utils/AppError.js';

// Load and cache the Lua script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const luaScript = fs.readFileSync(path.join(__dirname, '../scripts/tokenBucket.lua'), 'utf8');

// Configuration
const CAPACITY = 10;       // Max 10 requests in a burst
const REFILL_RATE = 1;     // 1 token per second
const COST = 1;            // Each request costs 1 token

export const rateLimiter = async (req, res, next) => {
  try {
    // Use IP address as the identifier (in production, use User ID or API Key)
    const identifier = req.ip || req.connection.remoteAddress;
    const redisKey = `rate_limit:${identifier}`;

    const now = Date.now();

    // Execute the Lua script atomically in Redis
    const result = await redis.eval(
      luaScript,
      1,               // Number of keys
      redisKey,        // KEYS[1]
      CAPACITY,        // ARGV[1]
      REFILL_RATE,     // ARGV[2]
      now,             // ARGV[3]
      COST             // ARGV[4]
    );

    const isAllowed = result[0] === 1;
    const remainingTokens = result[1];

    if (!isAllowed) {
      // Calculate how long until 1 token refills (in seconds)
      const retryAfter = Math.ceil(COST / REFILL_RATE);
      
      // Set standard rate limit headers
      res.setHeader('RateLimit-Limit', CAPACITY);
      res.setHeader('RateLimit-Remaining', 0);
      res.setHeader('Retry-After', retryAfter);

      throw new AppError(429, 'Too many requests, please try again later.', 'RATE_LIMIT_EXCEEDED');
    }

    // Attach rate limit info to response headers for the frontend to use
    res.setHeader('RateLimit-Limit', CAPACITY);
    res.setHeader('RateLimit-Remaining', remainingTokens);

    next();
  } catch (error) {
    // If Redis is down, fail open (let the request through) or fail closed (reject all)
    // For user experience, we will fail open and log the error.
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error('Rate limiter Redis error:', error);
    next(); 
  }
};