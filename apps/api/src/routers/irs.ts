import { z } from "zod";
import { protectedProcedure, router, publicProcedure } from "../trpc";

export const irsRouter = router({
  getScore: protectedProcedure.query(async ({ ctx }) => {
    const score = await ctx.prisma.iRSScore.findFirst({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return score ?? { score: 0, details: {}, createdAt: null };
  }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const scores = await ctx.prisma.iRSScore.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return scores;
  }),

  getBlindspots: protectedProcedure.query(async ({ ctx }) => {
    // Find modules where user scored low — those are "blindspots"
    const submissions = await ctx.prisma.submission.findMany({
      where: { userId: ctx.session.user.id, status: "scored" },
      include: { module: true },
      orderBy: { createdAt: "desc" },
    });

    // Group by module and calculate average scores
    const moduleScores = new Map<string, { module: (typeof submissions)[number]["module"]; scores: number[] }>();
    for (const sub of submissions) {
      if (!sub.feedback) continue;
      try {
        const parsed = JSON.parse(sub.feedback) as { overallScore?: number };
        if (typeof parsed.overallScore === "number") {
          const existing = moduleScores.get(sub.moduleId) ?? {
            module: sub.module,
            scores: [],
          };
          existing.scores.push(parsed.overallScore);
          moduleScores.set(sub.moduleId, existing);
        }
      } catch {
        // skip unparseable feedback
      }
    }

    const blindspots = Array.from(moduleScores.entries())
      .map(([id, data]) => {
        const avg =
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        const averageScore = Math.round(avg * 100);
        return {
          id,
          moduleTitle: data.module?.title ?? "Unknown",
          averageScore,
          attemptCount: data.scores.length,
          severity: Math.max(0, 100 - averageScore),
        };
      })
      .filter((b) => b.severity > 30)
      .sort((a, b) => b.severity - a.severity);

    return blindspots;
  }),

  recalculate: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get all scored submissions
    const submissions = await ctx.prisma.submission.findMany({
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

    // Create new IRS score record
    const score = await ctx.prisma.iRSScore.create({
      data: {
        userId,
        score: averageScore,
        details: {
          submissionsScored: scoredCount,
          lastCalculated: new Date().toISOString(),
        },
      },
    });

    return score;
  }),

  getLeaderboard: publicProcedure.query(async ({ ctx }) => {
    const scores = await ctx.prisma.iRSScore.findMany({
      include: { user: { select: { name: true, image: true } } },
      orderBy: { score: "desc" },
      take: 50,
    });
    return scores.map((s, i) => ({
      rank: i + 1,
      userId: s.userId,
      name: s.user.name ?? "Anonymous",
      avatar: s.user.image,
      score: s.score,
    }));
  }),
});
