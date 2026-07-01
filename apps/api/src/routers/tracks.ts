import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../trpc";

export const tracksRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const tracks = await ctx.prisma.track.findMany({
      where: { published: true },
      include: { _count: { select: { modules: true } } },
      orderBy: { title: "asc" },
    });
    return tracks;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const track = await ctx.prisma.track.findUnique({
        where: { id: input.id },
        include: {
          modules: { orderBy: { order: "asc" } },
        },
      });
      if (!track)
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
      return track;
    }),

  getProgress: protectedProcedure.query(async ({ ctx }) => {
    // Count completed submissions per track
    const submissions = await ctx.prisma.submission.findMany({
      where: { userId: ctx.session.user.id },
      select: { moduleId: true, status: true },
    });
    const tracks = await ctx.prisma.track.findMany({
      where: { published: true },
      include: { modules: { select: { id: true } } },
    });
    return tracks.map((track) => ({
      ...track,
      progress: track.modules.reduce(
        (acc, mod) => {
          const sub = submissions.find((s) => s.moduleId === mod.id);
          if (sub?.status === "scored" || sub?.status === "defended")
            acc.completed++;
          if (sub) acc.started++;
          return acc;
        },
        { completed: 0, started: 0 },
      ),
      totalModules: track.modules.length,
    }));
  }),
});
