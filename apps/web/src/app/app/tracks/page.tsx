"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTracksQuery } from "@/lib/mock-data/hooks";

export default function TracksPage() {
  const { data: tracks, isLoading } = useTracksQuery();

  if (isLoading || !tracks) return <LoadingPanel />;

  return (
    <>
      <PageHeader
        eyebrow="tracks"
        title="Choose a training path"
        description="Every track is mocked now, but the structures match the planned module flow."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {tracks.map((track) => (
          <Card key={track.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{track.title}</CardTitle>
                <Badge variant="outline">{track.difficulty}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="min-h-16 text-sm leading-6 text-muted-foreground">{track.description}</p>
              <div className="my-4">
                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{track.progress}%</span>
                </div>
                <Progress value={track.progress} />
              </div>
              <div className="space-y-2">
                {track.modules.map((module) => (
                  <Link
                    key={module.id}
                    href={`/app/tracks/${track.id}/modules/${module.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-background/60 p-3 text-sm transition hover:border-primary/60"
                  >
                    <span>{module.title}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
