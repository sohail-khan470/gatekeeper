// src/controllers/messageController.js
import { messageService } from '../services/messageService.js';

class MessageController {
  async createMessage(req, res, next) {
    try {
      // Read from req.validated.body instead of req.body
      const { content, author } = req.validated.body; 
      
      const newMessage = await messageService.createMessage(content, author);
      
      res.status(201).json({
        success: true,
        data: newMessage,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      // Read from req.validated.query instead of req.query
      const limit = parseInt(req.validated.query.limit, 10);
      const cursor = req.validated.query.cursor;

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