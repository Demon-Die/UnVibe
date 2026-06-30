/**
 * HTTP client for the UnVibe AI Service (Python FastAPI).
 *
 * Provides typed methods for all AI endpoints: code generation, quiz
 * generation, code diff scoring, and defend session Q&A.
 *
 * Includes retry logic, timeouts, and structured logging via pino.
 */

import pino from 'pino';

const logger = pino({ name: 'ai-client' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateCodeParams {
  problemDescription: string;
  language: string;
  difficulty: string;
}

export interface GenerateCodeResult {
  code: string;
  language: string;
  modelUsed: string;
  tokenCount: number;
}

export interface QuizParams {
  code: string;
  annotations: Array<{ lineStart: number; lineEnd: number; text: string }>;
  topic: string;
  count: number;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

export interface QuizResult {
  title: string;
  questions: Question[];
}

export interface DiffParams {
  originalCode: string;
  updatedCode: string;
  language: string;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  explanation: string;
}

export interface DiffResult {
  overallScore: number;
  dimensions: DimensionScore[];
  summary: string;
  cleanDiff: string;
}

export interface DefendMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DefendParams {
  sessionId: string;
  code: string;
  problemDescription: string;
  messages: DefendMessage[];
}

export interface DefendResult {
  nextQuestion: string | null;
  passed: boolean;
  feedback: string | null;
  score: number | null;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class AIClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class AIClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options?: { baseUrl?: string; timeoutMs?: number; maxRetries?: number }) {
    this.baseUrl = options?.baseUrl ?? process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
    this.timeoutMs = options?.timeoutMs ?? 10_000;
    this.maxRetries = options?.maxRetries ?? 2;
  }

  // -----------------------------------------------------------------------
  // Public API methods
  // -----------------------------------------------------------------------

  async generateCode(params: GenerateCodeParams): Promise<GenerateCodeResult> {
    const body = {
      problem_description: params.problemDescription,
      language: params.language,
      difficulty: params.difficulty,
    };
    const data = await this.request<{ code: string; language: string; model_used: string; token_count: number }>(
      'POST',
      '/generate/',
      body,
    );
    return {
      code: data.code,
      language: data.language,
      modelUsed: data.model_used,
      tokenCount: data.token_count,
    };
  }

  async generateQuiz(params: QuizParams): Promise<QuizResult> {
    const body = {
      code: params.code,
      annotations: params.annotations.map((a) => ({
        line_start: a.lineStart,
        line_end: a.lineEnd,
        text: a.text,
      })),
      topic: params.topic,
      count: params.count,
    };
    const data = await this.request<{ title: string; questions: any[] }>('POST', '/quiz/generate', body);
    return {
      title: data.title,
      questions: data.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctOption: q.correct_option,
        explanation: q.explanation,
      })),
    };
  }

  async diffCode(params: DiffParams): Promise<DiffResult> {
    const body = {
      original_code: params.originalCode,
      updated_code: params.updatedCode,
      language: params.language,
    };
    const data = await this.request<{
      overall_score: number;
      dimensions: Array<{ dimension: string; score: number; explanation: string }>;
      summary: string;
      clean_diff: string;
    }>('POST', '/diff/', body);
    return {
      overallScore: data.overall_score,
      dimensions: data.dimensions,
      summary: data.summary,
      cleanDiff: data.clean_diff,
    };
  }

  async defendAsk(params: DefendParams): Promise<DefendResult> {
    const body = this.buildDefendBody(params);
    const data = await this.request<{
      next_question: string | null;
      passed: boolean;
      feedback: string | null;
      score: number | null;
    }>('POST', '/defend/respond', body);
    return {
      nextQuestion: data.next_question,
      passed: data.passed,
      feedback: data.feedback,
      score: data.score,
    };
  }

  async defendEvaluate(params: DefendParams): Promise<DefendResult> {
    // Same endpoint — the service determines mode based on conversation length
    return this.defendAsk(params);
  }

  // -----------------------------------------------------------------------
  // Health check
  // -----------------------------------------------------------------------

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private buildDefendBody(params: DefendParams): Record<string, unknown> {
    return {
      session_id: params.sessionId,
      code: params.code,
      problem_description: params.problemDescription,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new AIClientError(
            `AI service returned ${response.status}: ${errorBody || response.statusText}`,
            response.status,
            path,
          );
        }

        const data = (await response.json()) as T;
        logger.info({ endpoint: path, attempt: attempt + 1 }, 'AI service call succeeded');
        return data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (lastError instanceof AIClientError && lastError.statusCode && lastError.statusCode < 500) {
          // Client errors (4xx) should not be retried
          logger.warn({ endpoint: path, status: lastError.statusCode }, 'Non-retryable AI client error');
          throw lastError;
        }

        if (attempt < this.maxRetries) {
          const wait = 2 ** attempt * 500;
          logger.warn({ endpoint: path, attempt: attempt + 1, wait }, 'Retrying AI service call');
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
      }
    }

    throw new AIClientError(
      `AI service call failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`,
      undefined,
      path,
    );
  }
}

// Singleton instance
export const aiClient = new AIClient();
