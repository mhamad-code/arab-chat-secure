import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المنصة الخاصة — مراسلة آمنة" },
      { name: "description", content: "منصة مراسلة خاصة يديرها المسؤول بالكامل." },
      { property: "og:title", content: "المنصة الخاصة — مراسلة آمنة" },
      { property: "og:description", content: "منصة مراسلة خاصة يديرها المسؤول بالكامل." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: isAdmin } = await supabase.rpc("is_admin");
    throw redirect({ to: isAdmin ? "/admin" : "/chat" });
  },
  component: () => (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="size-6 animate-spin text-primary" aria-label="جارٍ التحميل" />
    </div>
  ),
});
