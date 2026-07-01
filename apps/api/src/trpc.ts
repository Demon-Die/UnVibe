import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import type { Context, Session } from './context';

// ---------------------------------------------------------------------------
// tRPC initialisation — typed against Context so every procedure has full
// type-safe access to prisma, logger, io, submissionQueue, and session.
// ---------------------------------------------------------------------------
export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Base exports
// ---------------------------------------------------------------------------
export const router = t.router;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;
export const createCallerFactory = t.createCallerFactory;
export const routerFactory = t.router;

// ---------------------------------------------------------------------------
// Public procedure — no auth required
// ---------------------------------------------------------------------------
export const publicProcedure = t.procedure;

// ---------------------------------------------------------------------------
// Auth middleware
//
// Rejects requests where ctx.session is null with UNAUTHORIZED.
// On success, narrows ctx.session to Session (non-nullable) so downstream
// procedures don't need null checks.
// ---------------------------------------------------------------------------
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be signed in to access this resource.',
    });
  }

  // Re-pass ctx with session narrowed to non-null for type safety in procedures
  return next({
    ctx: {
      ...ctx,
      session: ctx.session as Session,
    },
  });
});

// ---------------------------------------------------------------------------
// Protected procedure — requires a valid, non-expired session
// ---------------------------------------------------------------------------
export const protectedProcedure = t.procedure.use(isAuthenticated);
