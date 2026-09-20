import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_MS = 45_000;

/** Keeps profiles.last_seen_at fresh so partners see an accurate online state. */
export function usePresence(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const ping = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
    };

    void ping();
    const timer = window.setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [userId]);
}
