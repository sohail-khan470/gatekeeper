// src/middlewares/validate.js
import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    // With safeParse, error is always result.error.issues
    const errorMessage = result.error.issues.map((issue) => issue.message).join(', ');

    return next(new AppError(400, errorMessage, 'VALIDATION_ERROR'));
  }

  // Optional: Replace req with validated data
  // req.body = result.data.body;
  // req.query = result.data.query;
  // req.params = result.data.params;

  next();
};
