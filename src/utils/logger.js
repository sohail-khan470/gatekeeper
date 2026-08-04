const log = (level, message) => {
  const timeStamp = new Date().toISOString();
  console.log(`[${timeStamp}] [${level.toUpperCase()}] ${message}`);
};

export const logger = {
  info: (message) => log('INFO', message),
  warn: (message) => log('WARN', message),
  error: (message) => log('ERROR', message),
};
