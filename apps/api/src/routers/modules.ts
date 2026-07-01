import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../trpc";

export const modulesRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const module = await ctx.prisma.module.findUnique({
        where: { id: input.id },
      });
      if (!module)
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      return module;
    }),

  getByTrack: publicProcedure
    .input(z.object({ trackId: z.string() }))
    .query(async ({ ctx, input }) => {
      const modules = await ctx.prisma.module.findMany({
        where: { trackId: input.trackId },
        orderBy: { order: "asc" },
      });
      return modules;
    }),

  submitDecode: protectedProcedure
    .input(
      z.object({
        moduleId: z.string(),
        code: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create a submission with pending status
      const submission = await ctx.prisma.submission.create({
        data: {
          userId: ctx.session.user.id,
          moduleId: input.moduleId,
          code: input.code,
          status: "pending",
        },
      });

      // Enqueue to BullMQ if the queue is available
      if (ctx.submissionQueue) {
        await ctx.submissionQueue.add("process-submission", {
          submissionId: submission.id,
          userId: ctx.session.user.id,
          moduleId: input.moduleId,
          code: input.code,
          originalCode: "", // Will be populated by the worker from the module content
        });
      }

      return { submissionId: submission.id, status: submission.status };
    }),

  getProgress: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const submissions = await ctx.prisma.submission.findMany({
        where: { userId: ctx.session.user.id, moduleId: input.moduleId },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      return {
        hasStarted: submissions.length > 0,
        latestSubmission: submissions[0] ?? null,
      };
    }),
});
