import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../trpc";

export const authRouter = router({
  signIn: publicProcedure.input(z.object({ email: z.string().email() })).query(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return { user };
  }),

  signUp: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      const user = await ctx.prisma.user.create({
        data: { name: input.name, email: input.email },
      });
      return { user };
    }),

  getSession: protectedProcedure.query(({ ctx }) => {
    return { user: ctx.session.user };
  }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    // Session deletion requires sessionToken — context provides it
    if (ctx.session.sessionToken) {
      await ctx.prisma.session.delete({
        where: { sessionToken: ctx.session.sessionToken },
      });
    }
    return { success: true };
  }),
});
