"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

export default function TracksPage() {
  const { data: tracks, isLoading } = trpc.tracks.getAll.useQuery();

  if (isLoading || !tracks) return <LoadingPanel />;

  if (tracks.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="tracks"
          title="Choose a training path"
          description="Select a track to begin training with real modules."
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">No tracks available yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Tracks are being prepared. Check back soon.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="tracks"
        title="Choose a training path"
        description="Select a track to begin training with real modules."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {tracks.map((track) => (
          <Card key={track.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{track.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="min-h-16 text-sm leading-6 text-muted-foreground">{track.description}</p>
              <div className="my-4">
                <p className="text-xs text-muted-foreground">{track.moduleCount} module{track.moduleCount !== 1 ? "s" : ""}</p>
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
