import pino from "pino";

const logger = pino({ name: "judge0-client" });

const JUDGE0_URL = process.env.JUDGE0_URL ?? "http://localhost:2358";

export interface Judge0Submission {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
  status: { id: number; description: string };
}

export class Judge0Error extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "Judge0Error";
  }
}

/**
 * Submit code to Judge0 for execution.
 * Uses synchronous mode (wait=true) for simplicity — the Decode phase
 * runs short code snippets that complete in under 5 seconds.
 */
export async function executeCode(params: {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}): Promise<Judge0Submission> {
  try {
    const response = await fetch(`${JUDGE0_URL}/submissions?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: params.source_code,
        language_id: params.language_id,
        stdin: params.stdin ?? "",
        expected_output: params.expected_output,
        cpu_time_limit: params.cpu_time_limit ?? 5,
        memory_limit: params.memory_limit ?? 128000,
      }),
    });

    if (!response.ok) {
      throw new Judge0Error(`Judge0 returned ${response.status}`, response.status);
    }

    return response.json() as Promise<Judge0Submission>;
  } catch (err) {
    if (err instanceof Judge0Error) throw err;
    logger.error({ err }, "Judge0 request failed");
    throw new Judge0Error("Judge0 request failed");
  }
}

/**
 * Language IDs for Judge0.
 * See https://ce.judge0.com/#/ for the full list.
 */
export const LANGUAGE_IDS = {
  python: 71,
  javascript: 63,
  typescript: 74, // Via Deno
  cpp: 54,
  java: 62,
  go: 60,
  rust: 73,
} as const;
