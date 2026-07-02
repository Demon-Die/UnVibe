"use client";

import { useEffect } from "react";
import { TRPCProvider } from "@/lib/trpc/provider";
import { useAuthStore } from "@/stores/auth-store";

function SessionRestorer({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);
  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <SessionRestorer>{children}</SessionRestorer>
    </TRPCProvider>
  );
}
