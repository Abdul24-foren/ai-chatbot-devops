import { GoogleGenAI } from '@google/genai';

import { config } from '../config/env.js';

const getGeminiClient = () => {
  if (
    !config.geminiApiKey ||
    config.geminiApiKey.includes('your_')
  ) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: config.geminiApiKey,
  });
};

export const generateConversationTitle = (userMessage) => {
  const trimmed = (userMessage || '').trim();

  if (!trimmed) {
    return 'New Conversation';
  }

  const cleaned = trimmed.replace(/\s+/g, ' ');

  if (cleaned.length <= 40) {
    return cleaned;
  }

  return cleaned.slice(0, 40).trim();
};

export const buildConversationContext = (messages) => {
  return messages
    .slice(-12)
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text: message.content,
        },
      ],
    }));
};

export const streamChatCompletion = async ({
  messages,
  res,
  onChunk,
  onDone,
  onError,
}) => {
  const gemini = getGeminiClient();

  if (!gemini) {
    throw new Error('Gemini API key is not configured.');
  }

  const contents = buildConversationContext(messages);

  const responseStream =
    await gemini.models.generateContentStream({
      model: config.geminiModel,

      contents,

      config: {
        systemInstruction: config.systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 1200,
      },
    });

  let fullText = '';

  for await (const chunk of responseStream) {
    const text = chunk.text || '';

    if (text) {
      fullText += text;

      if (onChunk) {
        onChunk(text);
      }
    }
  }

  if (onDone) {
    onDone(fullText);
  }

  return fullText;
};

export const generateSingleResponse = async (messages) => {
  const gemini = getGeminiClient();

  if (!gemini) {
    throw new Error('Gemini API key is not configured.');
  }

  const contents = buildConversationContext(messages);

  const response = await gemini.models.generateContent({
    model: config.geminiModel,

    contents,

    config: {
      systemInstruction: config.systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 1200,
    },
  });

  return response.text || '';
};