# AI-Driven Chatbot Platform

A production-style AI chatbot platform with real authentication, PostgreSQL persistence, and streaming OpenAI responses.

## Overview

This project includes a Node.js/Express backend and a Vite + React + Tailwind frontend. It supports:

- User registration and login with JWT authentication
- Real conversation management with Prisma + PostgreSQL
- AI chat with Server-Sent Events streaming
- Sidebar search and grouped conversation history
- Markdown-rendered assistant responses with code highlighting
- Secure API patterns, validation, and rate limits

## Features

- Premium dark-first chat interface
- Real authentication flow with password hashing and JWT
- Protected routes and conversation ownership checks
- AI message generation via the OpenAI JavaScript SDK
- Progressive streaming response rendering
- Conversation title generation and message history retrieval
- Search by conversation title
- Responsive sidebar and mobile drawer
- Copy, retry, and regenerate actions
- Human-readable API errors and centralized handling

## Architecture

- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express, Prisma, PostgreSQL
- AI: OpenAI API with streaming responses
- Auth: JWT + bcrypt
- Real-time UX: SSE

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios
- React Markdown
- remark-gfm
- react-syntax-highlighter
- lucide-react

### Backend
- Node.js
- Express
- JavaScript
- JWT
- bcryptjs
- OpenAI SDK
- Server-Sent Events
- express-rate-limit
- dotenv
- cors

### Database
- PostgreSQL
- Prisma ORM

## Database Schema

The backend Prisma schema includes the following models:

- User
- Conversation
- Message
- MessageFeedback

Key relationships:

- User -> Conversation -> Message
- Message -> MessageFeedback

## API Documentation

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Conversations
- POST /api/conversations
- GET /api/conversations
- GET /api/conversations/search?q=
- GET /api/conversations/:id
- PATCH /api/conversations/:id
- DELETE /api/conversations/:id

### Messages
- GET /api/conversations/:id/messages
- POST /api/conversations/:id/messages
- POST /api/messages/:id/regenerate

### Health
- GET /api/health

## Setup

### PostgreSQL Setup

1. Install PostgreSQL locally.
2. Create a database named `ai_chatbot`.
3. Update the `DATABASE_URL` in the backend `.env` file.

Example:

```bash
createdb ai_chatbot
```

Example connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/ai_chatbot"
```

### Prisma Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

### OpenAI Setup

1. Create an OpenAI API key.
2. Add it to the backend `.env` file.
3. Configure `OPENAI_MODEL` to a valid model name.

### Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

## Running Locally

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Backend runs at:

- http://localhost:5000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

- http://localhost:5173

## Testing

```bash
cd backend
npm test
```

## Future Roadmap

- Conversation export
- Workspace sharing
- Multi-model switching
- Analytics dashboard
- File upload and attachments
- Team collaboration

## Notes

This project intentionally keeps secrets in environment files and never exposes the OpenAI API key to the frontend.
