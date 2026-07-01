import type { Request } from "express";
import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import type { Server } from "socket.io";
import type { Queue } from "bullmq";

// ---------------------------------------------------------------------------
// Shared infrastructure dependencies injected at startup
// ---------------------------------------------------------------------------
export interface ContextDeps {
  prisma: PrismaClient;
  logger: Logger;
  io: Server;
  submissionQueue: Queue | null; // null when Redis is unavailable
}

// ---------------------------------------------------------------------------
// Session shape — only the fields the API needs from User
// ---------------------------------------------------------------------------
export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

export interface Session {
  user: SessionUser;
  sessionToken: string;
}

// ---------------------------------------------------------------------------
// Token extraction
//
// This is the ONLY place that knows about transport conventions.
// To switch from Authorization header to cookie (or vice versa), change this
// function alone — nothing else in the auth stack needs to move.
//
// Current strategy (precedence order):
//   1. Authorization: Bearer <token>   — explicit header (Server Components, API clients)
//   2. authjs.session-token cookie     — forwarded Auth.js cookie (browser requests)
// ---------------------------------------------------------------------------
export function extractSessionToken(req: Request): string | null {
  // 1. Bearer token header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || null;
  }

  // 2. Auth.js session cookie (dev name; prod uses __Secure-authjs.session-token)
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match =
      // production (Secure prefix)
      cookieHeader.match(/(?:^|;\s*)__Secure-authjs\.session-token=([^;]+)/) ??
      // development
      cookieHeader.match(/(?:^|;\s*)authjs\.session-token=([^;]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Session validation
//
// Looks up the extracted token in the database.
// Returns null for missing, invalid, or expired sessions — never throws.
// Callers (protectedProcedure) decide whether to error.
// ---------------------------------------------------------------------------
async function resolveSession(token: string | null, prisma: PrismaClient): Promise<Session | null> {
  if (!token) return null;

  const dbSession = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (!dbSession || dbSession.expires <= new Date()) return null;

  return { user: dbSession.user, sessionToken: dbSession.sessionToken };
}

// ---------------------------------------------------------------------------
// createContext — called per request by the tRPC Express adapter
// ---------------------------------------------------------------------------
export async function createContext({ req }: { req: Request }, deps: ContextDeps): Promise<Context> {
  const token = extractSessionToken(req);
  const session = await resolveSession(token, deps.prisma);

  return {
    prisma: deps.prisma,
    logger: deps.logger,
    io: deps.io,
    submissionQueue: deps.submissionQueue,
    session,
  };
}

export type Context = ContextDeps & { session: Session | null };
