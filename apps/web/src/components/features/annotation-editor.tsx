"use client";

import { useState } from "react";
import type { Annotation } from "@/lib/mock-data/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function AnnotationEditor({ annotations: initial }: { annotations: Annotation[] }) {
  const [annotations, setAnnotations] = useState(initial);
  const [note, setNote] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add what this block is responsible for."
        />
        <Button
          className="self-start"
          onClick={() => {
            if (!note.trim()) return;
            setAnnotations((items) => [
              ...items,
              { id: crypto.randomUUID(), line: 1 + items.length * 2, tag: "note", note },
            ]);
            setNote("");
          }}
        >
          Add
        </Button>
      </div>
      {annotations.map((annotation) => (
        <div key={annotation.id} className="rounded-md border border-border bg-background/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">line {annotation.line}</Badge>
            <Badge variant="secondary">{annotation.tag}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{annotation.note}</p>
        </div>
      ))}
    </div>
  );
}
