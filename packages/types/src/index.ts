export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  title: string;
  content: string;
  trackId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Submission {
  id: string;
  userId: string;
  moduleId: string;
  code: string;
  status: string;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefendSession {
  id: string;
  userId: string;
  moduleId: string;
  status: string;
  conversation: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarRoom {
  id: string;
  name: string;
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRSScore {
  id: string;
  userId: string;
  score: number;
  details: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// UI / domain types (moved from apps/web/src/lib/mock-data/types.ts)
// ---------------------------------------------------------------------------

export type ModulePhase = "decode" | "rebuild" | "defend";

export interface MockModule {
  id: string;
  trackId: string;
  title: string;
  summary: string;
  order: number;
  estimatedMinutes: number;
  sourceCode: string;
  starterCode: string;
  language: string;
  concepts: string[];
}

export interface Annotation {
  id: string;
  line: number;
  note: string;
  tag: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface DiffLine {
  id: string;
  type: "same" | "add" | "remove";
  left?: string;
  right?: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  streak: number;
  track: string;
}

export interface WarRoomMessage {
  id: string;
  author: string;
  body: string;
  timestamp: string;
  kind: "chat" | "system" | "defend";
}

export interface Blindspot {
  id: string;
  concept: string;
  severity: number;
  evidence: string;
  nextAction: string;
}
