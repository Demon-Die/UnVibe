"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Brain, MessageSquareQuote } from "lucide-react";
import type { Annotation, DiffLine, MockModule, QuizQuestion } from "@unvibe/types";
import { useEditorStore } from "@/stores/editor-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnnotationEditor } from "./annotation-editor";
import { CodeEditor } from "./code-editor";
import { CodeSubmission } from "./code-submission";
import { DiffViewer } from "./diff-viewer";
import { QuizUI } from "./quiz-ui";

const phases = [
  { id: "decode", label: "Decode", icon: BookOpenCheck },
  { id: "rebuild", label: "Rebuild", icon: Brain },
  { id: "defend", label: "Defend", icon: MessageSquareQuote },
] as const;

export function ModulePlayer({
  module,
  moduleId,
  annotations,
  quiz,
  diffLines,
}: {
  module: MockModule;
  moduleId: string;
  annotations: Annotation[];
  quiz: QuizQuestion[];
  diffLines: DiffLine[];
}) {
  const { phase, setPhase, code, setCode, resetCode, language } = useEditorStore();
  const [defendAnswers, setDefendAnswers] = useState<string[]>([
    "I would preserve the early return so later branches can assume a user exists.",
  ]);

  useEffect(() => {
    resetCode(module.starterCode);
  }, [module.id, module.starterCode, resetCode]);

  const progress = useMemo(() => (phase === "decode" ? 33 : phase === "rebuild" ? 66 : 100), [phase]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{module.title}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">{module.summary}</p>
              </div>
              <Badge variant="outline">{module.estimatedMinutes} min</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {phases.map((item) => {
                const Icon = item.icon;
                const active = item.id === phase;
                return (
                  <button
                    key={item.id}
                    onClick={() => setPhase(item.id)}
                    className={`rounded-md border p-3 text-left transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/50 text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="mb-2 h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>

        {phase === "decode" ? (
          <CodeEditor code={module.sourceCode} language={language} onChange={() => undefined} readOnly />
        ) : (
          <CodeEditor
            code={code || module.starterCode}
            language={language}
            onChange={setCode}
            onReset={() => resetCode(module.starterCode)}
          />
        )}
      </section>

      <aside className="space-y-4">
        {phase === "decode" ? (
          <Card>
            <CardHeader>
              <CardTitle>Annotations</CardTitle>
            </CardHeader>
            <CardContent>
              <AnnotationEditor annotations={annotations} />
              <Button className="mt-4 w-full" onClick={() => setPhase("rebuild")}>
                Unlock rebuild
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {phase === "rebuild" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Decode quiz</CardTitle>
              </CardHeader>
              <CardContent>
                <QuizUI questions={quiz} />
              </CardContent>
            </Card>
            <CodeSubmission moduleId={moduleId} />
            <Button className="w-full" variant="secondary" onClick={() => setPhase("defend")}>
              Start defend
            </Button>
          </>
        ) : null}

        {phase === "defend" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Live defend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-border bg-background/60 p-3 text-sm">
                  Why should the missing user branch return before reading roles?
                </div>
                {defendAnswers.map((answer, index) => (
                  <div key={index} className="rounded-md bg-primary/10 p-3 text-sm text-primary">
                    {answer}
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setDefendAnswers((items) => [
                      ...items,
                      "Because it narrows the state and keeps role checks deterministic.",
                    ])
                  }
                >
                  Add mock answer
                </Button>
              </CardContent>
            </Card>
            <DiffViewer lines={diffLines} />
          </>
        ) : null}
      </aside>
    </div>
  );
}
