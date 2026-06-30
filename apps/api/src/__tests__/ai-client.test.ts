/**
 * Tests for the AIClient bridge.
 *
 * These tests mock fetch to avoid calling the real AI service.
 */

import { AIClient, AIClientError } from '../services/ai-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(response: unknown, ok = true, status = 200): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  } as Response);
}

function mockFetchError(error: Error): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockRejectedValue(error);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AIClient', () => {
  let client: AIClient;

  beforeEach(() => {
    client = new AIClient({ baseUrl: 'http://test-ai:8000', timeoutMs: 5000, maxRetries: 1 });
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // generateCode
  // -----------------------------------------------------------------------

  describe('generateCode', () => {
    it('should call POST /generate/ and return mapped result', async () => {
      const mockResponse = {
        code: 'def hello(): pass',
        language: 'python',
        model_used: 'claude-sonnet-4-20250514',
        token_count: 42,
      };
      mockFetch(mockResponse);

      const result = await client.generateCode({
        problemDescription: 'Write hello world',
        language: 'python',
        difficulty: 'easy',
      });

      expect(result.code).toBe('def hello(): pass');
      expect(result.modelUsed).toBe('claude-sonnet-4-20250514');
      expect(result.tokenCount).toBe(42);
    });

    it('should throw AIClientError on 500', async () => {
      mockFetch({ error: 'Internal Server Error' }, false, 500);

      await expect(
        client.generateCode({ problemDescription: 'test', language: 'python', difficulty: 'easy' }),
      ).rejects.toThrow(AIClientError);
    });

    it('should throw AIClientError on 4xx without retry', async () => {
      mockFetch({ error: 'Bad Request' }, false, 400);

      await expect(
        client.generateCode({ problemDescription: 'test', language: 'python', difficulty: 'easy' }),
      ).rejects.toThrow(AIClientError);
    });
  });

  // -----------------------------------------------------------------------
  // generateQuiz
  // -----------------------------------------------------------------------

  describe('generateQuiz', () => {
    it('should map snake_case response to camelCase', async () => {
      const mockResponse = {
        title: 'Test Quiz',
        questions: [
          {
            id: 'q-1',
            question: 'What does X do?',
            options: ['A', 'B', 'C', 'D'],
            correct_option: 0,
            explanation: 'Because X does Y.',
          },
        ],
      };
      mockFetch(mockResponse);

      const result = await client.generateQuiz({
        code: 'x = 1',
        annotations: [],
        topic: 'Test',
        count: 1,
      });

      expect(result.title).toBe('Test Quiz');
      expect(result.questions[0].correctOption).toBe(0);
      expect(result.questions[0].explanation).toBe('Because X does Y.');
    });
  });

  // -----------------------------------------------------------------------
  // diffCode
  // -----------------------------------------------------------------------

  describe('diffCode', () => {
    it('should map snake_case diff response to camelCase', async () => {
      const mockResponse = {
        overall_score: 0.85,
        dimensions: [
          { dimension: 'Structural similarity', score: 0.9, explanation: 'Good match' },
        ],
        summary: 'Good rebuild',
        clean_diff: '@@ -1 +1 @@\n-x\n+y',
      };
      mockFetch(mockResponse);

      const result = await client.diffCode({
        originalCode: 'x = 1',
        updatedCode: 'y = 1',
        language: 'python',
      });

      expect(result.overallScore).toBe(0.85);
      expect(result.dimensions[0].dimension).toBe('Structural similarity');
      expect(result.cleanDiff).toContain('-x');
    });
  });

  // -----------------------------------------------------------------------
  // defend
  // -----------------------------------------------------------------------

  describe('defend', () => {
    it('should return nextQuestion from ask mode', async () => {
      const mockResponse = {
        next_question: 'Why did you choose a list?',
        passed: false,
        feedback: null,
        score: null,
      };
      mockFetch(mockResponse);

      const result = await client.defendAsk({
        sessionId: 's1',
        code: 'x = []',
        problemDescription: 'Test',
        messages: [],
      });

      expect(result.nextQuestion).toBe('Why did you choose a list?');
      expect(result.passed).toBe(false);
    });

    it('should return pass/fail from evaluate mode', async () => {
      const mockResponse = {
        next_question: null,
        passed: true,
        feedback: 'Great answer!',
        score: 90,
      };
      mockFetch(mockResponse);

      const result = await client.defendEvaluate({
        sessionId: 's1',
        code: 'x = []',
        problemDescription: 'Test',
        messages: [{ role: 'assistant', content: 'Q?' }, { role: 'user', content: 'A!' }],
      });

      expect(result.passed).toBe(true);
      expect(result.feedback).toBe('Great answer!');
      expect(result.score).toBe(90);
    });
  });

  // -----------------------------------------------------------------------
  // Retry logic
  // -----------------------------------------------------------------------

  describe('retry behavior', () => {
    it('should retry on transient failure and succeed', async () => {
      const mock = jest.spyOn(global, 'fetch');
      const mockResponse = {
        code: 'success after retry',
        language: 'python',
        model_used: 'claude',
        token_count: 10,
      };

      // First call fails, second succeeds
      mock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        } as Response);

      const result = await client.generateCode({
        problemDescription: 'test',
        language: 'python',
        difficulty: 'easy',
      });

      expect(result.code).toBe('success after retry');
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it('should throw after exhausting retries', async () => {
      mockFetchError(new Error('Persistent error'));

      await expect(
        client.generateCode({ problemDescription: 'test', language: 'python', difficulty: 'easy' }),
      ).rejects.toThrow(AIClientError);
    });
  });

  // -----------------------------------------------------------------------
  // Health check
  // -----------------------------------------------------------------------

  describe('healthCheck', () => {
    it('should return true when service responds', async () => {
      mockFetch({ status: 'ok' });

      const healthy = await client.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when service is down', async () => {
      mockFetchError(new Error('Connection refused'));

      const healthy = await client.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
