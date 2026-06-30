"use client";

import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { IRSRadarChart } from "@/components/features/irs-radar-chart";
import { StreakTracker } from "@/components/features/streak-tracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileQuery } from "@/lib/mock-data/hooks";

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfileQuery();

  if (isLoading || !profile) return <LoadingPanel label="Loading profile" />;

  return (
    <>
      <PageHeader eyebrow="profile" title={profile.name} description={profile.role} action={<Badge>IRS {profile.irs}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <IRSRadarChart data={profile.radarData} />
        <StreakTracker streak={profile.streak} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Name: {profile.name}</p>
            <p>Role: {profile.role}</p>
            <p>Completed modules: {profile.completedModules}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.recent.map((item) => (
              <div key={item} className="rounded-md border border-border bg-background/60 p-3 text-sm">{item}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
