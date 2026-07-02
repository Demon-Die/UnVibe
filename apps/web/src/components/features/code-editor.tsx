"use client";

import Editor from "@monaco-editor/react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

export function CodeEditor({ code, language, onChange, onReset, readOnly = false }: { code: string; language: string; onChange: (value: string) => void; onReset?: () => void; readOnly?: boolean }) {
  const darkMode = useUIStore((state) => state.darkMode);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{language}</span>
        {onReset ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        ) : null}
      </div>
      <Editor
        height="420px"
        language={language}
        value={code}
        theme={darkMode ? "vs-dark" : "light"}
        onChange={(value) => onChange(value ?? "")}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          wordWrap: "on",
        }}
      />
    </div>
  );
}
