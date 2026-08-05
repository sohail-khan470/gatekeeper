// src/middlewares/idempotency.js
import crypto from 'crypto';
import { redis } from '../config/redisClient.js';
import { AppError } from '../utils/AppError.js';

// 24 hours in seconds
const IDEMPOTENCY_TTL = 24 * 60 * 60;

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
      .update(JSON.stringify(req.body))
      .digest('hex');

    const redisKey = `idemp:${idempotencyKey}`;

    // 2. Try to set the key in Redis.
    // NX means "Only set if it does NOT exist"
    // EX sets the expiration time
    const acquiredLock = await redis.set(redisKey, bodyFingerprint, 'EX', IDEMPOTENCY_TTL, 'NX');

    // 3. If acquiredLock is 'OK', this is the FIRST request. Let it proceed.
    if (acquiredLock === 'OK') {
      // We need to intercept res.json to save the response later
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.hset(redisKey, {
            response: JSON.stringify(body),
            statusCode: res.statusCode,
          });
          redis.expire(redisKey, IDEMPOTENCY_TTL); // Reset TTL
        } else {
          // If it failed, delete the lock so they can retry
          redis.del(redisKey);
        }
        return originalJson(body);
      };
      return next();
    }

    // 4. If acquiredLock is null, the key ALREADY EXISTS. This is a duplicate request.
    // Wait briefly for the first request to finish writing the response
    let storedData = await redis.hgetall(redisKey);

    // Simple polling loop to wait for the first request to finish
    let retries = 0;
    while (!storedData.response && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      storedData = await redis.hgetall(redisKey);
      retries++;
    }

    // 5. Check for body conflict
    const storedFingerprint = storedData.fingerprint || (await redis.get(redisKey));
    if (storedFingerprint !== bodyFingerprint) {
      throw new AppError(
        409,
        'Idempotency key was used with a different request body',
        'IDEMPOTENCY_CONFLICT'
      );
    }

    // 6. If response is ready, replay it
    if (storedData.response) {
      return res.status(parseInt(storedData.statusCode, 10)).json(JSON.parse(storedData.response));
    } else {
      // If we timed out waiting, return a 409 Conflict
      throw new AppError(409, 'Request is still processing', 'REQUEST_IN_PROGRESS');
    }
  } catch (error) {
    next(error);
  }
};
