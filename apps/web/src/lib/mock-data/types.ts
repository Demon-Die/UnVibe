export type ModulePhase = "decode" | "rebuild" | "defend";

export interface MockTrack {
  id: string;
  title: string;
  description: string;
  difficulty: "Foundation" | "Intermediate" | "Advanced";
  progress: number;
  modules: MockModule[];
}

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
