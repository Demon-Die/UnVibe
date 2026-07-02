import { PrismaClient } from "@prisma/client";

export interface IRSResult {
  score: number;
  submissionsScored: number;
  details: {
    submissionsScored: number;
    lastCalculated: string;
  };
}

/**
 * Calculate the IRS (Individual Readiness Score) for a user.
 *
 * Aggregates all scored submissions and computes the average.
 * Used by both the submission worker and the manual recalculate endpoint.
 */
export async function calculateIRS(prisma: PrismaClient, userId: string): Promise<IRSResult> {
  const submissions = await prisma.submission.findMany({
    where: { userId, status: "scored" },
    select: { feedback: true },
  });

  let totalScore = 0;
  let scoredCount = 0;

  for (const sub of submissions) {
    if (sub.feedback) {
      try {
        const parsed = JSON.parse(sub.feedback) as { overallScore?: number };
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

  return {
    score: averageScore,
    submissionsScored: scoredCount,
    details: {
      submissionsScored: scoredCount,
      lastCalculated: new Date().toISOString(),
    },
  };
}
