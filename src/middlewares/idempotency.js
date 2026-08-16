// src/middlewares/idempotency.js
import crypto from 'crypto';
import { redis } from '../config/redisClient.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

// 24 hours in seconds
const IDEMPOTENCY_TTL = 24 * 60 * 60;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 50;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const idempotency = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];

  // If no key is provided, skip idempotency (treat as a normal request)
  if (!idempotencyKey) {
    return next();
  }

  try {
    // 1. Create a SHA-256 hash (fingerprint) of the raw JSON body
    const bodyFingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body ?? {}))
      .digest('hex');

    const redisKey = `idemp:${idempotencyKey}`;

    // 2. Use HSETNX to atomically set the fingerprint field
    // Returns 1 if the field was set (first request), 0 if it already existed (duplicate)
    const isFirstRequest = await redis.hsetnx(redisKey, 'fingerprint', bodyFingerprint);

    // 3. FIRST REQUEST: Lock acquired
    if (isFirstRequest === 1) {
      // Set expiration immediately to prevent orphaned locks
      await redis.expire(redisKey, IDEMPOTENCY_TTL);

      // Intercept res.json to save the response after it's sent
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Save response and status code as Hash fields
          redis
            .hset(redisKey, {
              response: JSON.stringify(body),
              statusCode: res.statusCode.toString(),
            })
            .then(() => redis.expire(redisKey, IDEMPOTENCY_TTL))
            .catch((err) => {
              console.error('Idempotency cache error:', err);
              // Clean up on error to prevent stale locks
              redis.del(redisKey).catch(() => {});
            });
        } else {
          // If it failed, delete the lock so they can retry with the same key
          redis.del(redisKey).catch((err) => {
            console.error('Idempotency delete error:', err);
          });
        }
        return originalJson(body);
      };

      return next();
    }

    // 4. DUPLICATE REQUEST: Lock already exists
    let storedData = await redis.hgetall(redisKey);

    // 5. Wait briefly for the first request to finish writing the response
    let retries = 0;
    while (!storedData.response && retries < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
      storedData = await redis.hgetall(redisKey);

      // If key was deleted (first request failed), allow this request to retry
      if (!storedData || Object.keys(storedData).length === 0) {
        // Key no longer exists, treat this as a new request
        return idempotency(req, res, next);
      }

      retries++;
    }

    // 6. Check for body conflict
    if (storedData.fingerprint !== bodyFingerprint) {
      throw new AppError(
        409,
        'Idempotency key was used with a different request body',
        'IDEMPOTENCY_CONFLICT'
      );
    }

    // 7. If response is ready, replay it
    if (storedData.response) {
      const statusCode = parseInt(storedData.statusCode || '200', 10);
      const responseBody = JSON.parse(storedData.response);
      return res.status(statusCode).json(responseBody);
    }

    // 8. If we timed out waiting, return a 409 Conflict
    throw new AppError(
      409,
      'Request is still processing',
      'REQUEST_IN_PROGRESS'
    );
  } catch (error) {
    // Pass any errors to the error handler
    next(error);
  }
};