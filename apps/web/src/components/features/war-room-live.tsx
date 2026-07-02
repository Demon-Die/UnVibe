"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry, WarRoomMessage } from "@unvibe/types";
import { getSocket } from "@/lib/socket/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Leaderboard } from "./leaderboard";

export function WarRoomLive({
  messages: initialMessages,
  leaderboard,
}: {
  messages: WarRoomMessage[];
  leaderboard: LeaderboardEntry[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const socket = getSocket();
    const timer = window.setInterval(() => {
      setMessages((items) => [
        ...items.slice(-5),
        {
          id: crypto.randomUUID(),
          author: "Defend Bot",
          body: "Mock live prompt: compare behavior, not formatting.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          kind: "defend",
        },
      ]);
    }, 6000);

    socket.connect();
    return () => {
      window.clearInterval(timer);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Room feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[520px] space-y-3 overflow-y-auto rounded-md border border-border bg-background/60 p-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded-md border border-border bg-card p-3">
                <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{message.author}</span>
                  <span>{message.timestamp}</span>
                </div>
                <p className="text-sm">{message.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Send a room note"
            />
            <Button
              onClick={() => {
                if (!draft.trim()) return;
                setMessages((items) => [
                  ...items,
                  { id: crypto.randomUUID(), author: "You", body: draft, timestamp: "now", kind: "chat" },
                ]);
                setDraft("");
              }}
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
      <Leaderboard entries={leaderboard} />
    </div>
  );
}
