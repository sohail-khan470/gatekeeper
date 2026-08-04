// src/middlewares/errorHandler.js
import { logger } from '../utils/logger.js';

// Not found handler (runs when no route matches)
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler (must have 4 arguments)
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  let code = err.code || 'INTERNAL_ERROR';

  // Log the error for our internal debugging
  logger.error(`${statusCode} - ${message}`);

  // If it's our custom AppError, use its values
  if (err.isOperational) {
    statusCode = err.statusCode;
  }

  // In production, hide stack traces. In development, show them.
  const response = {
    success: false,
    error: {
      code: code,
      message: message,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
