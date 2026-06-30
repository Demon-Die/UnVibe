import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import net from 'net';
import { router, publicProcedure } from './trpc';
import { createSubmissionWorker } from './services/submission-worker';
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

// ---------------------------------------------------------------------------
// Redis / BullMQ setup (resilient — works without Redis running)
// ---------------------------------------------------------------------------

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connectionOpts = {
  host: redisUrl.split('://')[1]?.split(':')[0] || 'localhost',
  port: parseInt(redisUrl.split(':')[2]) || 6379,
};

/**
 * Quick TCP connectivity check — avoids BullMQ's infinite retry spam when
 * Redis is not available (e.g. Docker not running).
 */
function checkRedisReachable(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

let submissionQueue: Queue | null = null;
// declared here for scope; assigned inside initRedisDeps
let submissionWorker: ReturnType<typeof createSubmissionWorker> | null = null;

async function initRedisDeps(): Promise<void> {
  const available = await checkRedisReachable(connectionOpts.host, connectionOpts.port);

  if (!available) {
    logger.warn(
      'Redis unavailable — job queue and submission worker disabled. ' +
        'Start Docker with: docker compose -f infra/docker-compose.yml up -d',
    );
    return;
  }

  try {
    submissionQueue = new Queue('submissions', {
      connection: connectionOpts,
    });
    await submissionQueue.waitUntilReady();

    submissionWorker = createSubmissionWorker(prisma, connectionOpts);

    logger.info('Redis connected — job queue and submission worker enabled');
  } catch (err) {
    logger.warn(
      { err },
      'Failed to initialize BullMQ — job queue and submission worker disabled. ' +
        'Start Docker with: docker compose -f infra/docker-compose.yml up -d',
    );
    submissionQueue = null;
    submissionWorker = null;
  }
}

// Fire-and-forget: server starts immediately even if Redis init is pending
initRedisDeps().catch((err) => {
  logger.error({ err }, 'Unexpected error during Redis initialization');
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
    createContext: () => ({ prisma, logger, io, submissionQueue }),
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
