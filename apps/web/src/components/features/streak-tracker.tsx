import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StreakTracker({ streak }: { streak: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Streak</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <Flame className="h-8 w-8 text-amber-400" />
          <div>
            <p className="text-4xl font-semibold">{streak}</p>
            <p className="text-sm text-muted-foreground">days in training</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
