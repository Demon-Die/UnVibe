import type { DiffLine } from "@/lib/mock-data/types";
import { cn } from "@/lib/utils";

export function DiffViewer({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-2 border-b border-border px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span>source</span>
        <span>rebuild</span>
      </div>
      <div className="font-mono text-xs">
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn(
              "grid grid-cols-2 border-b border-border/60 last:border-0",
              line.type === "add" && "bg-emerald-500/10",
              line.type === "remove" && "bg-red-500/10",
            )}
          >
            <pre className="overflow-x-auto p-2 text-muted-foreground">{line.left ?? ""}</pre>
            <pre className="overflow-x-auto p-2">{line.right ?? ""}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
