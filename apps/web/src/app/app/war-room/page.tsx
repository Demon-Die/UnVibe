"use client";

import { PageHeader } from "@/components/app/page-header";
import { LoadingPanel } from "@/components/app/loading-panel";
import { Badge } from "@/components/ui/badge";
import { WarRoomLive } from "@/components/features/war-room-live";
import { useWarRoomQuery } from "@/lib/mock-data/hooks";

export default function WarRoomPage() {
  const { data, isLoading } = useWarRoomQuery();

  if (isLoading || !data) return <LoadingPanel label="Joining War Room" />;

  return (
    <>
      <PageHeader
        eyebrow="war room"
        title={data.room.name}
        description="Socket.io client wiring is present with a mock live feed so the room works without backend events."
        action={<Badge variant="success">{data.room.members} members live</Badge>}
      />
      <WarRoomLive messages={data.messages} leaderboard={data.leaderboard} />
    </>
  );
}
