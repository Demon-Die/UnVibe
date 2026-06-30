"use client";

import Link from "next/link";
import { ArrowRight, Clock, Target, Trophy } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDashboardQuery } from "@/lib/mock-data/hooks";
import { IRSRadarChart } from "@/components/features/irs-radar-chart";
import { Leaderboard } from "@/components/features/leaderboard";
import { StreakTracker } from "@/components/features/streak-tracker";

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useDashboardQuery();

  if (isLoading || !dashboard) return <LoadingPanel />;

  const stats = [
    { label: "IRS", value: dashboard.user.irs, copy: "Irreplaceability score", icon: Trophy },
    { label: "Rank", value: `#${dashboard.user.rank}`, copy: "War Room placement", icon: Target },
    { label: "Focus", value: "34m", copy: "Next module estimate", icon: Clock },
  ];

  return (
    <>
      <PageHeader
        eyebrow="dashboard"
        title="Training status"
        description="Mock data mirrors the future API shape while the backend catches up."
        action={<Button asChild><Link href="/app/tracks/frontend-systems/modules/auth-guard-rebuild">Resume module<ArrowRight className="h-4 w-4" /></Link></Button>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
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
            <CardTitle>{dashboard.activeTrack.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">{dashboard.activeTrack.description}</p>
            <Progress value={dashboard.activeTrack.progress} />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {dashboard.activeTrack.modules.map((module) => (
                <Link key={module.id} href={`/app/tracks/${dashboard.activeTrack.id}/modules/${module.id}`} className="rounded-md border border-border bg-background/60 p-4 transition hover:border-primary/60">
                  <p className="font-medium">{module.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{module.summary}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <StreakTracker streak={dashboard.user.streak} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <IRSRadarChart data={dashboard.radarData} />
        <Leaderboard entries={dashboard.leaderboard} />
      </div>
    </>
  );
}
