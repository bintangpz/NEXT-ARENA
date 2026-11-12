"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArenaLogo } from "@/components/ArenaLogo";

export default function TandingRootRedirect() {
  const router = useRouter();
  const [msg, setMsg] = useState("Menghubungkan ke Arena Pertandingan...");

  useEffect(() => {
    async function findActiveMatch() {
      try {
        const res = await fetch("/api/arena");
        if (res.ok) {
          const json = await res.json();
          const matches = json.bracketMatches || [];
          if (matches.length > 0) {
            // Find active match or first match
            const active =
              matches.find((m: any) => m.status === "Berlangsung") ||
              matches.find((m: any) => m.status === "Siap Tanding") ||
              matches[0];
            router.replace(`/tanding/${active.id}`);
            return;
          }
        }
        setMsg("Belum ada jadwal pertandingan yang dibuat. Mengalihkan ke Konsol...");
        setTimeout(() => router.replace("/pengaturan"), 1500);
      } catch (e) {
        router.replace("/pengaturan");
      }
    }
    findActiveMatch();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4 text-white">
      <ArenaLogo size="lg" />
      <p className="text-sm font-mono text-zinc-400 animate-pulse">{msg}</p>
    </div>
  );
}

