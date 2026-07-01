import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import { PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { router, publicProcedure } from './trpc';
import { createContext } from './context';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Initialize Sentry
if (process.env.SENTRY_DSN_API) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_API,
    tracesSampleRate: 1.0,
  });
}

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize BullMQ (Create a dummy queue for scaffolding check)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connectionOpts = {
  host: redisUrl.split('://')[1]?.split(':')[0] || 'localhost',
  port: parseInt(redisUrl.split(':')[2]) || 6379,
};

const submissionQueue = new Queue('submissions', {
  connection: connectionOpts,
});

const submissionWorker = new Worker(
  'submissions',
  async (job) => {
    logger.info({ jobId: job.id }, 'Processing submission job');
    return { processed: true };
  },
  { connection: connectionOpts }
);

submissionWorker.on('error', (err) => {
  logger.error(err, 'Submission worker error');
});

// tRPC router
const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date() };
  }),
});

export type AppRouter = typeof appRouter;

const app = express();
const httpServer = createServer(app);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

app.use(cors());
app.use(express.json());

// Sentry handler (request)
if (process.env.SENTRY_DSN_API) {
  app.use(Sentry.Handlers.requestHandler());
}

// tRPC express middleware
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: (opts) => createContext(opts, { prisma, logger, io, submissionQueue }),
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api' });
});

// Sentry handler (errors)
if (process.env.SENTRY_DSN_API) {
  app.use(Sentry.Handlers.errorHandler());
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  logger.info(`Express API server running on port ${PORT}`);
});
