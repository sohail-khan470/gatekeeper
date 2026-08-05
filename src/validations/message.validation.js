// src/validations/message.validation.js
import { z } from 'zod';

// Define the schema for creating a message
export const createMessageSchema = z.object({
  body: z.object({
    content: z
      .string({
        required_error: 'Content is required',
        invalid_type_error: 'Content must be a string',
      })
      .min(1, 'Content cannot be empty')
      .max(500, 'Content too long'),

    author: z
      .string({
        required_error: 'Author is required',
      })
      .min(2, 'Author name must be at least 2 characters'),
  }),
});

export const getMessageSchema = z.object({
  query: z.object({
    limie: z.string().optional().default('10'),
    cursor: z.string().optional(),
  }),
});
