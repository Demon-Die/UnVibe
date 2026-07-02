import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../trpc";

export const warRoomRouter = router({
  getRoom: publicProcedure.query(async ({ ctx }) => {
    const room = await ctx.prisma.warRoom.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "No active war room" });
    return room;
  }),

  getMessages: publicProcedure
    .input(z.object({ roomId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      // Messages are handled via Socket.io currently
      // Return empty array as placeholder — real-time via socket
      return [];
    }),

  getLeaderboard: publicProcedure.query(async ({ ctx }) => {
    const scores = await ctx.prisma.iRSScore.findMany({
      include: { user: { select: { name: true, image: true } } },
      orderBy: { score: "desc" },
      take: 20,
    });
    return scores.map((s, i) => ({
      rank: i + 1,
      userId: s.userId,
      name: s.user.name ?? "Anonymous",
      avatar: s.user.image,
      score: s.score,
    }));
  }),

  joinRoom: protectedProcedure.input(z.object({ roomId: z.string() })).mutation(async ({ ctx, input }) => {
    const room = await ctx.prisma.warRoom.findUnique({
      where: { id: input.roomId },
    });
    if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
    // Socket.io handles the actual join — this is a REST-style check
    return { room, success: true };
  }),
});
