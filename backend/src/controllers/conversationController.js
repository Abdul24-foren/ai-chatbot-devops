import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse, normalizeError } from '../utils/response.js';
import {
  generateConversationTitle,
  generateSingleResponse,
  buildConversationContext,
  streamChatCompletion,
} from '../services/aiService.js';

export const createConversation = async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user.id,
        title: 'New Conversation',
      },
    });

    return res.status(201).json(successResponse({ conversation }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const listConversations = async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10,
        },
      },
    });

    return res.json(successResponse({ conversations }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const searchConversations = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: req.user.id,
        title: {
          contains: q,
          mode: 'insensitive',
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return res.json(successResponse({ conversations }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const getConversationById = async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json(errorResponse('Conversation not found.'));
    }

    return res.json(successResponse({ conversation }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const updateConversation = async (req, res, next) => {
  try {
    const { title } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json(errorResponse('Conversation title is required.'));
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!existingConversation) {
      return res.status(404).json(errorResponse('Conversation not found.'));
    }

    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: {
        title: title.trim(),
      },
    });

    return res.json(successResponse({ conversation }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const existingConversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!existingConversation) {
      return res.status(404).json(errorResponse('Conversation not found.'));
    }

    await prisma.conversation.delete({ where: { id: req.params.id } });
    return res.json(successResponse({ deleted: true }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!conversation) {
      return res.status(404).json(errorResponse('Conversation not found.'));
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(successResponse({ messages }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const createMessage = async (req, res, next) => {
  try {
    const { content } = req.body || {};

    if (!content || !content.trim()) {
      return res.status(400).json(errorResponse('Message content is required.'));
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!conversation) {
      return res.status(404).json(errorResponse('Conversation not found.'));
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: content.trim(),
      },
    });

    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    const titleCandidate = generateConversationTitle(content.trim());
    const shouldUpdateTitle = history.length <= 2 || conversation.title === 'New Conversation';

    if (shouldUpdateTitle) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          title: titleCandidate,
        },
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let assistantContent = '';
    let streamFailed = false;

    try {
      await streamChatCompletion({
        messages: history,
        onChunk: (delta) => {
          assistantContent += delta;
          res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
        },
      });

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

      const savedMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: assistantContent.trim() || 'I am sorry, I could not generate a response.',
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      res.write(`data: ${JSON.stringify({ type: 'message', message: savedMessage })}\n\n`);
      res.end();
    }      catch (streamError) {
      streamFailed = true;

      console.error('AI streaming error:', streamError);

      // The SSE response has already started.
      // Do NOT call next() because Express would try
      // to send another HTTP response.
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            message: 'Something went wrong while generating the AI response.'
          })}\n\n`
        );

        res.end();
      }

      return;
    }

    if (streamFailed) {
      return;
    }

    return;
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const regenerateMessage = async (req, res, next) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: {
        conversation: true,
      },
    });

    if (!message || message.conversation.userId !== req.user.id) {
      return res.status(404).json(errorResponse('Message not found.'));
    }

    const previousUserMessage = await prisma.message.findFirst({
      where: {
        conversationId: message.conversationId,
        role: 'user',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!previousUserMessage) {
      return res.status(400).json(errorResponse('No prior user message available for regeneration.'));
    }

    const history = await prisma.message.findMany({
      where: { conversationId: message.conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const context = buildConversationContext(history.filter((item) => item.id !== message.id));
    const responseText = await generateSingleResponse([
      ...context,
      { role: 'user', content: previousUserMessage.content },
    ]);

    await prisma.message.update({
      where: { id: message.id },
      data: { content: responseText },
    });

    return res.json(successResponse({ message: { ...message, content: responseText } }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};
