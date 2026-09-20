import express from 'express';
import { pathToFileURL } from 'node:url';
import { config } from './config/env.js';
import apiRouter from './routes/api.js';
import { prisma } from './config/prisma.js';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiRouter);

const startServer = async () => {
  try {
    await prisma.$connect();
    app.listen(config.port, () => {
      console.log(`Backend running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startServer();
}

export { app };
