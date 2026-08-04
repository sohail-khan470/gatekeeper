// src/middlewares/validate.js
import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    // parse throws an error if validation fails
    // we pass req, and it checks req.body, req.query, req.params based on schema
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    next(); // Validation passed, move to controller
  } catch (error) {
    console.log(error, 'EEEEE');
    error.ZodError.map(() => console.log(e.mesage));

    // Zod errors contain an array of issues

    // Pass a clean, standardized error to our global error handler
    next(new AppError(400, errorMessage, 'VALIDATION_ERROR'));
  }
};
