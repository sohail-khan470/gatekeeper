import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  let code = err.code || 'INTERNAL_ERROR';

  // Prisma: Database unavailable
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database is temporarily unavailable.';
  }

  // Prisma: Known request errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        code = 'UNIQUE_CONSTRAINT';
        message = 'Resource already exists.';
        break;

      case 'P2025':
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'Resource not found.';
        break;

      default:
        statusCode = 500;
        code = err.code;
        message = err.message;
    }
  }

  // Your custom AppError
  else if (err.isOperational) {
    statusCode = err.statusCode;
    code = err.code;
  }

  logger.error(err);

  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
