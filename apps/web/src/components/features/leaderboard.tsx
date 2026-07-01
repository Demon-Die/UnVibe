import type { LeaderboardEntry } from "@/lib/mock-data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-md border border-border bg-background/60 p-3"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">#{index + 1}</span>
              <div>
                <p className="font-medium">{entry.name}</p>
                <p className="text-xs text-muted-foreground">{entry.track}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={entry.name === "You" ? "success" : "secondary"}>{entry.score}</Badge>
              <span className="hidden text-xs text-muted-foreground sm:inline">{entry.streak}d</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
