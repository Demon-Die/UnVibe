import type { Annotation, Blindspot, DiffLine, LeaderboardEntry, MockTrack, QuizQuestion, WarRoomMessage } from "./types";

const sourceCode = `export function createGuard(session) {
  if (!session?.user) {
    return { allowed: false, reason: "Missing user" };
  }

  const roles = session.user.roles ?? [];
  return {
    allowed: roles.includes("builder"),
    reason: roles.includes("builder") ? "Ready" : "Builder role required",
  };
}`;

export const tracks: MockTrack[] = [
  {
    id: "frontend-systems",
    title: "Frontend Systems",
    description: "State, data fetching, auth surfaces, and editor-heavy product screens.",
    difficulty: "Intermediate",
    progress: 68,
    modules: [
      {
        id: "auth-guard-rebuild",
        trackId: "frontend-systems",
        title: "Auth guard rebuild",
        summary: "Decode a session guard and rebuild its branching logic from memory.",
        order: 1,
        estimatedMinutes: 34,
        sourceCode,
        starterCode: `export function createGuard(session) {\n  // Rebuild the guard from memory.\n}`,
        language: "typescript",
        concepts: ["auth", "branching", "defensive checks"],
      },
      {
        id: "query-cache",
        trackId: "frontend-systems",
        title: "Query cache policy",
        summary: "Reason about stale time, optimistic data, and recovery states.",
        order: 2,
        estimatedMinutes: 28,
        sourceCode,
        starterCode: sourceCode,
        language: "typescript",
        concepts: ["react-query", "cache", "latency"],
      },
    ],
  },
  {
    id: "ai-workflows",
    title: "AI Workflows",
    description: "Prompt contracts, diff scoring, quiz generation, and defend sessions.",
    difficulty: "Advanced",
    progress: 42,
    modules: [
      {
        id: "diff-score-contract",
        trackId: "ai-workflows",
        title: "Diff score contract",
        summary: "Compare code intent instead of matching text line by line.",
        order: 1,
        estimatedMinutes: 41,
        sourceCode,
        starterCode: sourceCode,
        language: "typescript",
        concepts: ["diff", "scoring", "contracts"],
      },
    ],
  },
  {
    id: "backend-foundations",
    title: "Backend Foundations",
    description: "tRPC procedures, Prisma access patterns, queue jobs, and socket events.",
    difficulty: "Foundation",
    progress: 24,
    modules: [
      {
        id: "trpc-health",
        trackId: "backend-foundations",
        title: "tRPC health procedure",
        summary: "Trace a thin procedure from client call to Express middleware.",
        order: 1,
        estimatedMinutes: 22,
        sourceCode,
        starterCode: sourceCode,
        language: "typescript",
        concepts: ["trpc", "express", "routing"],
      },
    ],
  },
];

export const annotations: Annotation[] = [
  { id: "a1", line: 2, tag: "guard", note: "Reject missing sessions before reading nested fields." },
  { id: "a2", line: 6, tag: "roles", note: "Default roles to an empty array so includes is safe." },
];

export const quiz: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Why does the guard use optional chaining on session?",
    options: ["To make the code shorter", "To avoid reading user from null or undefined", "To memoize the session", "To force OAuth refresh"],
    answerIndex: 1,
    explanation: "The first branch must be safe even when there is no session object.",
  },
  {
    id: "q2",
    prompt: "What behavior should remain stable in the rebuild?",
    options: ["Only exact whitespace", "The builder role check and failure reason", "The import order", "The variable names only"],
    answerIndex: 1,
    explanation: "The important behavior is access control and clear feedback, not identical formatting.",
  },
];

export const diffLines: DiffLine[] = [
  { id: "d1", type: "same", left: "export function createGuard(session) {", right: "export function createGuard(session) {" },
  { id: "d2", type: "same", left: "  if (!session?.user) {", right: "  if (!session?.user) {" },
  { id: "d3", type: "remove", left: "    return { allowed: false, reason: \"Missing user\" };" },
  { id: "d4", type: "add", right: "    return { allowed: false, reason: \"No user\" };" },
  { id: "d5", type: "same", left: "  const roles = session.user.roles ?? [];", right: "  const roles = session.user.roles ?? [];" },
  { id: "d6", type: "same", left: "}", right: "}" },
];

export const leaderboard: LeaderboardEntry[] = [
  { id: "u1", name: "Aarav", score: 91, streak: 14, track: "Frontend Systems" },
  { id: "u2", name: "Mira", score: 87, streak: 11, track: "AI Workflows" },
  { id: "u3", name: "You", score: 82, streak: 7, track: "Frontend Systems" },
  { id: "u4", name: "Dev", score: 78, streak: 5, track: "Backend Foundations" },
];

export const warRoomMessages: WarRoomMessage[] = [
  { id: "m1", author: "System", body: "Room opened for Auth guard rebuild.", timestamp: "11:42", kind: "system" },
  { id: "m2", author: "Mira", body: "Watch the default roles branch. It is easy to miss.", timestamp: "11:44", kind: "chat" },
  { id: "m3", author: "Defend Bot", body: "Explain why a missing role should return a reason string.", timestamp: "11:45", kind: "defend" },
];

export const blindspots: Blindspot[] = [
  { id: "b1", concept: "Null-safe access", severity: 78, evidence: "Missed 2 optional chaining branches", nextAction: "Replay auth guard decode" },
  { id: "b2", concept: "Cache invalidation", severity: 62, evidence: "Submitted stale query policy twice", nextAction: "Rebuild query cache module" },
  { id: "b3", concept: "Role semantics", severity: 44, evidence: "Weak defend answer on authorization reasons", nextAction: "Answer 3 defend prompts" },
];

export const radarData = [
  { subject: "Read", score: 86 },
  { subject: "Rebuild", score: 74 },
  { subject: "Defend", score: 68 },
  { subject: "Speed", score: 71 },
  { subject: "Recall", score: 82 },
  { subject: "Review", score: 64 },
];
