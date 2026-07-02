"use client";

import Link from "next/link";
import { ArrowRight, Clock, Target, Trophy } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc/client";
import { IRSRadarChart } from "@/components/features/irs-radar-chart";
import { Leaderboard } from "@/components/features/leaderboard";
import { StreakTracker } from "@/components/features/streak-tracker";

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = trpc.profile.getProfile.useQuery();
  const { data: tracks } = trpc.tracks.getAll.useQuery();
  const { data: leaderboard } = trpc.warRoom.getLeaderboard.useQuery();
  const { data: stats } = trpc.profile.getStats.useQuery();

  if (profileLoading) return <LoadingPanel />;

  const activeTrack = tracks?.[0] ?? null;
  const userRank = leaderboard?.findIndex((entry) => entry.userId === profile?.id) ?? -1;
  const rankDisplay = userRank >= 0 ? `#${userRank + 1}` : "--";

  const statCards = [
    { label: "IRS", value: profile?.irs ?? 0, copy: "Irreplaceability score", icon: Trophy },
    { label: "Rank", value: rankDisplay, copy: "War Room placement", icon: Target },
    { label: "Focus", value: "34m", copy: "Next module estimate", icon: Clock },
  ];

  const leaderboardEntries = (leaderboard ?? []).map((entry) => ({
    id: entry.userId,
    name: entry.name,
    score: entry.score,
    streak: 0,
    track: "",
  }));

  return (
    <>
      <PageHeader
        eyebrow="dashboard"
        title="Training status"
        description="Mock data mirrors the future API shape while the backend catches up."
        action={
          <Button asChild>
            <Link href="/app/tracks/frontend-systems/modules/auth-guard-rebuild">
              Resume module
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {stat.label}
                  <Icon className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.copy}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{activeTrack?.title ?? "No active track"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">{activeTrack?.description ?? ""}</p>
            {activeTrack ? <Progress value={0} /> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {activeTrack?.modules?.map((module) => (
                <Link
                  key={module.id}
                  href={`/app/tracks/${activeTrack.id}/modules/${module.id}`}
                  className="rounded-md border border-border bg-background/60 p-4 transition hover:border-primary/60"
                >
                  <p className="font-medium">{module.title}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <StreakTracker streak={stats?.currentStreak ?? 0} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <IRSRadarChart data={[]} />
        <Leaderboard entries={leaderboardEntries} />
      </div>
    </>
  );
}
