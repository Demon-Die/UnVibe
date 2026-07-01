/**
 * BullMQ worker that processes code submissions asynchronously.
 *
 * Flow:
 * 1. Receives a job with submissionId, userId, moduleId, code, originalCode
 * 2. Calls the AI service diff endpoint to score the rebuild
 * 3. Stores the score in the Submission record via Prisma
 * 4. Triggers IRS recalculation
 * 5. Schedules a Defend session
 */

import { Job, Worker, Queue, ConnectionOptions } from "bullmq";
import { PrismaClient } from "@prisma/client";
import pino from "pino";
import { aiClient, AIClientError } from "./ai-client";

const logger = pino({ name: "submission-worker" });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionJobData {
  submissionId: string;
  userId: string;
  moduleId: string;
  code: string;
  originalCode: string;
  language?: string;
}

export interface SubmissionJobResult {
  overallScore: number;
  feedback?: string;
  defendScheduled: boolean;
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createSubmissionWorker(
  prisma: PrismaClient,
  connection: ConnectionOptions,
): Worker<SubmissionJobData, SubmissionJobResult> {
  const worker = new Worker<SubmissionJobData, SubmissionJobResult>(
    "submissions",
    async (job: Job<SubmissionJobData>) => {
      logger.info({ jobId: job.id, submissionId: job.data.submissionId }, "Processing submission");

      const { submissionId, code, originalCode, moduleId, userId, language } = job.data;

      try {
        // 1. Call AI service for diff scoring
        const diffResult = await aiClient.diffCode({
          originalCode,
          updatedCode: code,
          language: language ?? "python",
        });

        logger.info({ jobId: job.id, overallScore: diffResult.overallScore }, "Diff scoring complete");

        // 2. Update Submission record with score and feedback
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: "scored",
            feedback: JSON.stringify({
              overallScore: diffResult.overallScore,
              dimensions: diffResult.dimensions,
              summary: diffResult.summary,
            }),
          },
        });

        logger.info({ jobId: job.id, submissionId }, "Submission score saved");

        // 3. Trigger IRS recalculation via the IRS engine
        //    (called asynchronously — the IRS service handles the actual calc)
        await triggerIRSRecalculation(prisma, userId);

        // 4. Schedule a Defend session
        const defendScheduled = await scheduleDefendSession(prisma, submissionId, userId, moduleId);

        return {
          overallScore: diffResult.overallScore,
          feedback: diffResult.summary,
          defendScheduled,
        };
      } catch (err) {
        logger.error({ jobId: job.id, err }, "Submission processing failed");

        // Mark submission as failed
        await prisma.submission
          .update({
            where: { id: submissionId },
            data: { status: "failed" },
          })
          .catch((e: unknown) => logger.error({ err: e }, "Failed to update submission status"));

        if (err instanceof AIClientError) {
          // Re-throw so BullMQ can retry according to its configured retry policy
          throw err;
        }
        throw err;
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 submissions in parallel
    },
  );

  worker.on("completed", (job: Job) => {
    logger.info({ jobId: job.id, result: job.returnvalue }, "Submission job completed");
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err: err.message }, "Submission job failed");
  });

  return worker;
}

// ---------------------------------------------------------------------------
// IRS recalculation
// ---------------------------------------------------------------------------

async function triggerIRSRecalculation(prisma: PrismaClient, userId: string): Promise<void> {
  // Calculate aggregate score from all scored submissions
  const submissions = await prisma.submission.findMany({
    where: { userId, status: "scored" },
    select: { feedback: true },
  });

  let totalScore = 0;
  let scoredCount = 0;

  for (const sub of submissions) {
    if (sub.feedback) {
      try {
        const parsed = JSON.parse(sub.feedback);
        if (typeof parsed.overallScore === "number") {
          totalScore += parsed.overallScore;
          scoredCount++;
        }
      } catch {
        // Skip unparseable feedback
      }
    }
  }

  const averageScore = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 100) : 0;

  // Create or update the latest IRS score
  await prisma.iRSScore.create({
    data: {
      userId,
      score: averageScore,
      details: {
        submissionsScored: scoredCount,
        lastCalculated: new Date().toISOString(),
      },
    },
  });

  logger.info({ userId, averageScore, scoredCount }, "IRS score recalculated");
}

// ---------------------------------------------------------------------------
// Defend session scheduling
// ---------------------------------------------------------------------------

async function scheduleDefendSession(
  prisma: PrismaClient,
  submissionId: string,
  userId: string,
  moduleId: string,
): Promise<boolean> {
  try {
    // Check if a defend session already exists for this (user, module) pair
    const existing = await prisma.defendSession.findFirst({
      where: { userId, moduleId, status: { notIn: ["completed", "expired"] } },
    });

    if (existing) {
      logger.info({ userId, moduleId }, "Active defend session already exists — skipping");
      return false;
    }

    // Create a new defend session record
    await prisma.defendSession.create({
      data: {
        userId,
        moduleId,
        status: "pending",
        conversation: [],
      },
    });

    logger.info({ userId, moduleId, submissionId }, "Defend session scheduled");
    return true;
  } catch (err) {
    logger.error({ err, userId, moduleId }, "Failed to schedule defend session");
    return false;
  }
}
