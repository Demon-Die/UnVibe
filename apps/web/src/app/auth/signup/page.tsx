"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingPanel } from "@/components/app/loading-panel";
import { useAuthStore } from "@/stores/auth-store";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signUp } = useAuthStore();

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setLoading(true);
    setError("");
    const ok = await signUp(name.trim(), email.trim());
    setLoading(false);
    if (ok) {
      router.push("/app/dashboard");
    } else {
      setError("Could not create account. The email may already be registered.");
    }
  };

  if (loading) return <LoadingPanel label="Creating account" />;

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
          <CardTitle className="text-2xl">Create account</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your details to start training.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => handleSignUp()}>
            <Github className="h-4 w-4" />
            Sign up with GitHub
          </Button>
          <Button className="w-full" variant="outline" onClick={() => handleSignUp()}>
            <Mail className="h-4 w-4" />
            Sign up with Google
          </Button>
          <div className="grid gap-2 pt-3">
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="email@company.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleSignUp}>
              Create account
            </Button>
          </div>
          <p className="pt-2 text-center text-sm text-muted-foreground">
            Already training?{" "}
            <Link className="text-primary" href="/auth/signin">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
