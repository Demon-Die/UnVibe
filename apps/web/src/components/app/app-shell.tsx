"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Map, RadioTower, Route, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeController } from "./theme-controller";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/tracks", label: "Tracks", icon: Route },
  { href: "/app/war-room", label: "War Room", icon: RadioTower },
  { href: "/app/blindspot-map", label: "Blindspots", icon: Map },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-card/80 backdrop-blur lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 font-mono text-sm font-semibold text-primary">
            UV
          </span>
          <div>
            <p className="font-semibold">UnVibe</p>
            <p className="font-mono text-xs text-muted-foreground">training console</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  active && "bg-primary/10 text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-semibold">UnVibe</span>
          </div>
          <div className="hidden lg:block">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">mock workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeController />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.name ?? "Guest"}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? "mock session"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:py-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 px-2 py-2 backdrop-blur lg:hidden">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] text-muted-foreground",
                  active && "bg-primary/10 text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
