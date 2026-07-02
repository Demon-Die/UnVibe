"use client";

import { useState } from "react";
import type { QuizQuestion } from "@unvibe/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuizUI({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const question = questions[index];
  const complete = index >= questions.length;

  if (complete) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
        Quiz complete. Rebuild is unlocked.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{question.prompt}</p>
      <div className="grid gap-2">
        {question.options.map((option, optionIndex) => {
          const picked = selected === optionIndex;
          const correct = selected !== null && optionIndex === question.answerIndex;
          return (
            <button
              key={option}
              onClick={() => setSelected(optionIndex)}
              className={cn(
                "rounded-md border border-border bg-background/60 p-3 text-left text-sm transition hover:bg-muted",
                picked && "border-primary text-primary",
                correct && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {selected !== null ? <p className="text-sm text-muted-foreground">{question.explanation}</p> : null}
      <Button
        disabled={selected === null}
        onClick={() => {
          setIndex((value) => value + 1);
          setSelected(null);
        }}
      >
        {index === questions.length - 1 ? "Finish quiz" : "Next question"}
      </Button>
    </div>
  );
}
