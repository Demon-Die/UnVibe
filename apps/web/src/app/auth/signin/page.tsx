"use client";

import Link from "next/link";
import { Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";

export default function SignInPage() {
  const { signIn } = useAuthStore();

  return (
    <main className="surface-grid flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur">
        <CardHeader>
          <Link href="/" className="mb-6 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 font-mono text-sm font-semibold text-primary">
              UV
            </span>
            <span className="font-semibold">UnVibe</span>
          </Link>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">Use OAuth later, or enter the mock workspace now.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" variant="outline" onClick={signIn}>
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
          <Button className="w-full" variant="outline" onClick={signIn}>
            <Mail className="h-4 w-4" />
            Continue with Google
          </Button>
          <div className="grid gap-2 pt-3">
            <Input placeholder="email@company.com" type="email" />
            <Button asChild onClick={signIn}>
              <Link href="/app/dashboard">Enter mock workspace</Link>
            </Button>
          </div>
          <p className="pt-2 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link className="text-primary" href="/auth/signup">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
