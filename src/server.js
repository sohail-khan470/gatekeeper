import 'dotenv/config';
import app from './app.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 4201;

const server = app.listen(PORT, () => {
  console.log(`[INFO] server is running on port ${PORT}`);
});

server.on('error', (error) => {
  console.error('[ERROR] Server failed to start:', error.message);
});
