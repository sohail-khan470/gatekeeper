import 'dotenv/config';
import app from './app.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  logger.info(`server is running on port ${PORT}`);
});
