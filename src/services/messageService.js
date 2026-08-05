// src/services/messageService.js
import { prisma } from '../config/prismaClient.js';
import { AppError } from '../utils/AppError.js';

class MessageService {
  async createMessage(content, author) {
    try {
      // Prisma generates the INSERT SQL behind the scenes
      const message = await prisma.message.create({
        data: {
          content,
          author,
        },
      });
      return message;
    } catch (error) {
      // If the database fails, throw a clean operational error
      logger.error('Database error during message creation:', error);
      throw new AppError(500, 'Failed to create message', 'DATABASE_ERROR');
    }
  }

  async getMessages() {
    // We will implement pagination here in the next lesson!
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' }, // Newest first
      take: 10, // Limit to 10 for now
    });
    return messages;
  }
}

// Export a singleton instance
export const messageService = new MessageService();
