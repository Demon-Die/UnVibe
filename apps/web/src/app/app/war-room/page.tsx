"use client";

import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Badge } from "@/components/ui/badge";
import { WarRoomLive } from "@/components/features/war-room-live";
import { trpc } from "@/lib/trpc/client";

export default function WarRoomPage() {
  const { data: room, isLoading } = trpc.warRoom.getRoom.useQuery();
  const { data: leaderboard } = trpc.warRoom.getLeaderboard.useQuery();

  if (isLoading || !room) return <LoadingPanel label="Joining War Room" />;

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
        eyebrow="war room"
        title={room.name}
        description="Socket.io client wiring is present with a mock live feed so the room works without backend events."
        action={<Badge variant="success">Live</Badge>}
      />
      <WarRoomLive messages={[]} leaderboard={leaderboardEntries} />
    </>
  );
}
