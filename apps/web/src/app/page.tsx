import Link from "next/link";
import { ArrowRight, Code2, GitBranch, Radar, ShieldQuestion, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const signals = [
  { label: "Decode", value: "annotate code intent", icon: Code2 },
  { label: "Rebuild", value: "write from memory", icon: GitBranch },
  { label: "Defend", value: "answer under pressure", icon: ShieldQuestion },
];

const featureCards = [
  { title: "Blindspots", copy: "See weak concepts before they become habits.", icon: Radar },
  { title: "War Rooms", copy: "Practice with peers in live competitive rooms.", icon: Swords },
  { title: "Code memory", copy: "Submit rebuilds and compare against source.", icon: Code2 },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="surface-grid relative min-h-screen border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(var(--primary)/0.20),transparent_32%),linear-gradient(180deg,hsl(var(--background)/0.15),hsl(var(--background))_72%)]" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/40 bg-primary/15 font-mono text-sm font-semibold text-primary">
              UV
            </span>
            <span className="font-semibold tracking-tight">UnVibe</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/signin" className="hidden text-sm text-muted-foreground transition hover:text-foreground sm:inline">
              Sign in
            </Link>
            <Button asChild>
              <Link href="/auth/signup">
                Start training
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-14 pt-12 lg:grid-cols-[1fr_520px] lg:items-center lg:pt-20">
          <div>
            <Badge variant="outline" className="mb-6 border-primary/40 bg-primary/10 text-primary">
              AI learning loop for builders
            </Badge>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Learn code until you can explain every decision.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              UnVibe turns passive tutorials into an active sequence: read production code, rebuild it, then defend your reasoning in live sessions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/app/dashboard">
                  Open mock dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/app/tracks">Browse tracks</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/90 p-4 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">live module</p>
                <h2 className="font-semibold">Auth guard rebuild</h2>
              </div>
              <Badge className="bg-accent text-accent-foreground">IRS 82</Badge>
            </div>
            <div className="grid gap-3">
              {signals.map((signal, index) => {
                const Icon = signal.icon;
                return (
                  <div key={signal.label} className="grid grid-cols-[42px_1fr] gap-3 rounded-md border border-border bg-background/70 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{signal.label}</p>
                        <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{signal.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-md border border-border bg-black p-4 font-mono text-xs leading-6 text-cyan-100">
              <p><span className="text-amber-300">const</span> session = defend(rebuild);</p>
              <p><span className="text-emerald-300">score</span>.update(session.reasoning);</p>
              <p className="text-muted-foreground">{"// next question streams into War Room"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-12 md:grid-cols-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon;
          return (
          <div key={feature.title} className="rounded-lg border border-border bg-card p-5">
            <Icon className="mb-5 h-5 w-5 text-primary" />
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
          </div>
          );
        })}
      </section>
    </main>
  );
}
