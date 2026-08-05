import Redis from 'ioredis';
import { logger } from '../utils/logger';

export const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => logger.info('Connected to Redis'));
redis.on('error', () => logger.error('Error connecting to redis'));
