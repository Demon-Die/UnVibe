"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CodeSubmission({ disabled }: { disabled?: boolean }) {
  const [status, setStatus] = useState<"idle" | "running" | "passed">("idle");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Submission</p>
          <p className="text-sm text-muted-foreground">Mock diff scoring keeps the flow local.</p>
        </div>
        <Badge variant={status === "passed" ? "success" : "secondary"}>{status}</Badge>
      </div>
      <Button
        className="mt-4 w-full"
        disabled={disabled || status === "running"}
        onClick={() => {
          setStatus("running");
          window.setTimeout(() => setStatus("passed"), 900);
        }}
      >
        <Send className="h-4 w-4" />
        Submit rebuild
      </Button>
    </div>
  );
}
