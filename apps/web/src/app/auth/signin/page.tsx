"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Github, Mail } from "lucide-react";
import { signIn as oauthSignIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingPanel } from "@/components/app/loading-panel";
import { useAuthStore } from "@/stores/auth-store";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn } = useAuthStore();

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    setLoading(true);
    setError("");
    const ok = await signIn(email.trim(), password);
    setLoading(false);
    if (ok) {
      router.push("/app/dashboard");
    } else {
      setError("Could not sign in. Check your credentials.");
    }
  };

  if (loading) return <LoadingPanel label="Signing in" />;

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
          <p className="text-sm text-muted-foreground">Enter your email to begin training.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => oauthSignIn("github", { redirectTo: "/app/dashboard" })}>
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
          <Button className="w-full" variant="outline" onClick={() => oauthSignIn("google", { redirectTo: "/app/dashboard" })}>
            <Mail className="h-4 w-4" />
            Continue with Google
          </Button>
          <div className="grid gap-2 pt-3">
            <Input
              placeholder="email@company.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleSignIn}>Sign in</Button>
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
