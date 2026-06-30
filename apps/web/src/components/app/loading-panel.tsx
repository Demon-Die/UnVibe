import { Card, CardContent } from "@/components/ui/card";

export function LoadingPanel({ label = "Loading mock data" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-2 w-40 animate-pulse rounded-full bg-primary/30" />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
