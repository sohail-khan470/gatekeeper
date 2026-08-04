// src/utils/AppError.js
export class AppError extends Error {
  constructor(statusCode, message, code = null) {
    super(message); // Call the parent Error constructor

    this.statusCode = statusCode;
    this.code = code; // Machine-readable code like 'VALIDATION_ERROR'
    this.isOperational = true; // Tells us this is a known error, not a bug

    Error.captureStackTrace(this, this.constructor);
  }
}
