// src/middlewares/validate.js
import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Attach the parsed data to a custom property on the request object
    req.validated = parsed;
    
    next();
  } catch (error) {
    const errorList = error.issues || error.errors;
    
    if (errorList && Array.isArray(errorList)) {
      const errorMessage = errorList.map((err) => err.message).join(', ');
      return next(new AppError(400, errorMessage, 'VALIDATION_ERROR'));
    }
    
    return next(new AppError(400, error.message || 'Invalid request data', 'VALIDATION_ERROR'));
  }
};