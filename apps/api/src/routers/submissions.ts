import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";

export const submissionsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        moduleId: z.string(),
        code: z.string().min(1, "Code cannot be empty"),
        originalCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify module exists
      const module = await ctx.prisma.module.findUnique({
        where: { id: input.moduleId },
      });
      if (!module) throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });

      // Create submission with pending status
      const submission = await ctx.prisma.submission.create({
        data: {
          userId,
          moduleId: input.moduleId,
          code: input.code,
          status: "pending",
        },
      });

      // Enqueue to BullMQ for async scoring
      if (ctx.submissionQueue) {
        await ctx.submissionQueue.add("process-submission", {
          submissionId: submission.id,
          userId,
          moduleId: input.moduleId,
          code: input.code,
          originalCode: input.originalCode ?? module.content,
          language: "typescript",
        });
      }

      return {
        id: submission.id,
        status: submission.status,
        queued: ctx.submissionQueue !== null,
      };
    }),

  getHistory: protectedProcedure
    .input(
      z
        .object({
          moduleId: z.string().optional(),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const where: Record<string, unknown> = { userId };
      if (input?.moduleId) where.moduleId = input.moduleId;

      const submissions = await ctx.prisma.submission.findMany({
        where,
        include: { module: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 20,
      });

      return submissions.map((sub) => ({
        ...sub,
        parsedFeedback: sub.feedback ? tryParseFeedback(sub.feedback) : null,
      }));
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const submission = await ctx.prisma.submission.findUnique({
      where: { id: input.id },
      include: { module: { select: { title: true, content: true } } },
    });

    if (!submission)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Submission not found",
      });
    if (submission.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not your submission",
      });
    }

    return {
      ...submission,
      parsedFeedback: submission.feedback ? tryParseFeedback(submission.feedback) : null,
    };
  }),
});

function tryParseFeedback(feedback: string): unknown {
  try {
    return JSON.parse(feedback) as unknown;
  } catch {
    return null;
  }
}
