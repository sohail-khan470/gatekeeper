//src app.js
import express from 'express';
import { logger } from './utils/logger.js';
const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: ok });
});

export default app;
