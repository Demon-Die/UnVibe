import { randomBytes } from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../trpc";

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function createSessionExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
}

export const authRouter = router({
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user)
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      if (user.passwordHash) {
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid)
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
      } else {
        // OAuth-only user has no password set; cannot use email/password sign-in
        throw new TRPCError({ code: "UNAUTHORIZED", message: "This account uses OAuth. Sign in with GitHub or Google." });
      }

      const sessionToken = generateSessionToken();
      await ctx.prisma.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires: createSessionExpiry(),
        },
      });

      return { user, sessionToken };
    }),

  signUp: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
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

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await ctx.prisma.user.create({
        data: { name: input.name, email: input.email, passwordHash },
      });

      const sessionToken = generateSessionToken();
      await ctx.prisma.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires: createSessionExpiry(),
        },
      });

      return { user, sessionToken };
    }),

  getSession: protectedProcedure.query(({ ctx }) => {
    return { user: ctx.session.user };
  }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.sessionToken) {
      await ctx.prisma.session.delete({
        where: { sessionToken: ctx.session.sessionToken },
      });
    }
    return { success: true };
  }),
});
