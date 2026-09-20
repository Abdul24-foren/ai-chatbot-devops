import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { errorResponse } from '../utils/response.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('Authentication required.'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json(errorResponse('Invalid or expired token.'));
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json(errorResponse('Invalid or expired token.'));
  }
};

export const authorizeConversationOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!conversation) {
      return res.status(404).json(errorResponse('Conversation not found.'));
    }

    if (conversation.userId !== req.user.id) {
      return res.status(403).json(errorResponse('You do not have permission to access this conversation.'));
    }

    req.conversation = conversation;
    next();
  } catch (error) {
    return res.status(500).json(errorResponse('Unable to validate conversation access.'));
  }
};
