// src/controllers/messageController.js
import { messageService } from '../services/messageService.js';

class MessageController {
  async createMessage(req, res, next) {
    try {
      const { content, author } = req.body; // Already validated by Zod!

      // Call the service
      const newMessage = await messageService.createMessage(content, author);

      // Send standard response envelope
      res.status(201).json({
        success: true,
        data: newMessage,
      });
    } catch (error) {
      // Pass errors to the global error handler
      next(error);
    }
  }

  //   async getMessages(req, res, next) {
  //     try {
  //       const messages = await messageService.getMessages();

  //       res.status(200).json({
  //         success: true,
  //         data: messages,
  //       });
  //     } catch (error) {
  //       next(error);
  //     }
  //   }

  async getMessages(req, res, next) {
    try {
      // Zod parsed these as strings, convert limit to integer
      const limit = parseInt(req.query.limit, 10);
      const cursor = req.query.cursor;

      const result = await messageService.getMessages(limit, cursor);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          nextCursor: result.nextCursor,
          hasNextPage: result.nextCursor !== null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
