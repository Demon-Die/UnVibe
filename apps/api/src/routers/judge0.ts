import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { executeCode, LANGUAGE_IDS, Judge0Error } from "../services/judge0-client";

export const judge0Router = router({
  execute: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1),
        language: z.enum(["python", "javascript", "typescript", "cpp", "java", "go", "rust"]),
        stdin: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const languageId = LANGUAGE_IDS[input.language];
      if (!languageId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported language: ${input.language}`,
        });
      }

      try {
        const result = await executeCode({
          source_code: input.code,
          language_id: languageId,
          stdin: input.stdin,
        });

        return {
          stdout: result.stdout,
          stderr: result.stderr,
          compileOutput: result.compile_output,
          time: result.time,
          memory: result.memory,
          status: result.status.description,
        };
      } catch (err) {
        if (err instanceof Judge0Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Code execution failed: ${err.message}`,
          });
        }
        throw err;
      }
    }),
});
