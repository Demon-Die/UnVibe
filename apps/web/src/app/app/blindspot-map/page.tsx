"use client";

import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc/client";

export default function BlindspotMapPage() {
  const { data: blindspots, isLoading } = trpc.irs.getBlindspots.useQuery();

  if (isLoading) return <LoadingPanel label="Mapping blindspots" />;

  const items = blindspots ?? [];

  return (
    <>
      <PageHeader
        eyebrow="blindspot map"
        title="Weak concepts by evidence"
        description="A compact view of concepts that need another decode, rebuild, or defend pass."
      />
      <div className="grid gap-4">
        {items.map((blindspot) => (
          <Card key={blindspot.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{blindspot.moduleTitle}</CardTitle>
                <Badge variant={blindspot.severity > 70 ? "warning" : "secondary"}>
                  {blindspot.severity}% risk
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={blindspot.severity} />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border bg-background/60 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
                  <p className="mt-2 text-sm">{blindspot.attemptCount} attempts — avg score {100 - blindspot.severity}%</p>
                </div>
                <div className="rounded-md border border-border bg-background/60 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next action</p>
                  <p className="mt-2 text-sm">Replay {blindspot.moduleTitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
