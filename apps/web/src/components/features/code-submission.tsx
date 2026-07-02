"use client";

import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEditorStore } from "@/stores/editor-store";
import { trpc } from "@/lib/trpc/client";

export function CodeSubmission({ moduleId, disabled }: { moduleId: string; disabled?: boolean }) {
  const code = useEditorStore((s) => s.code);
  const mutation = trpc.modules.submitDecode.useMutation();

  const handleSubmit = () => {
    if (!code.trim()) return;
    mutation.mutate({ moduleId, code });
  };

  const status = mutation.isPending ? "running" : mutation.isSuccess ? "passed" : mutation.isError ? "failed" : "idle";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Submission</p>
          <p className="text-sm text-muted-foreground">
            {mutation.isError
              ? "Something went wrong — try again."
              : "Submit your rebuild for evaluation."}
          </p>
        </div>
        <Badge variant={status === "passed" ? "success" : status === "failed" ? "destructive" : "secondary"}>
          {status === "running" ? "Running..." : status === "passed" ? "Passed" : status === "failed" ? "Error" : "Ready"}
        </Badge>
      </div>
      <Button
        className="mt-4 w-full"
        disabled={disabled || mutation.isPending || !code.trim() || mutation.isSuccess}
        onClick={handleSubmit}
      >
        {mutation.isPending ? (
          <>Evaluating...</>
        ) : mutation.isSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Submitted
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit rebuild
          </>
        )}
      </Button>
      {mutation.isError && (
        <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {mutation.error?.message ?? "Submission failed"}
        </p>
      )}
    </div>
  );
}
