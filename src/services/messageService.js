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

  //   async getMessages() {
  //     // We will implement pagination here in the next lesson!
  //     const messages = await prisma.message.findMany({
  //       orderBy: { createdAt: 'desc' }, // Newest first
  //       take: 10, // Limit to 10 for now
  //     });
  //     return messages;
  //   }
  async getMessages(limit, cursor) {
    // 1. Calculate how many items to fetch (limit + 1 to check for next page)
    const take = limit + 1;

    // 2. Build the query options
    const queryOptions = {
      take: take,
      orderBy: {
        id: 'desc', // Newest first (highest ID first)
      },
    };

    // 3. If a cursor is provided, tell Prisma to start AFTER that ID
    if (cursor) {
      queryOptions.cursor = { id: parseInt(cursor, 10) };
      queryOptions.skip = 1; // Skip the cursor item itself
    }

    const messages = await prisma.message.findMany(queryOptions);

    // 4. Check if we got more items than the requested limit
    const hasNextPage = messages.length > limit;

    // 5. If we did, remove the extra item from the array
    const items = hasNextPage ? messages.slice(0, -1) : messages;

    // 6. The next cursor is the ID of the last item in our list
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
    };
  }
}

// Export a singleton instance
export const messageService = new MessageService();
