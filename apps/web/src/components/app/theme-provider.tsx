"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useUIStore((state) => state.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="relative min-h-screen w-full">
      <div
        className="absolute inset-0 z-0"
        style={
          darkMode
            ? {
                background: "radial-gradient(125% 125% at 50% 100%, #000000 40%, #010133 100%)",
              }
            : {
                backgroundImage: "radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #ec4899 100%)",
                backgroundSize: "100% 100%",
              }
        }
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
