import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });

    // Account status and admin role are decided by the database, never by client state.
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,name,status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile || profile.status !== "active") {
      await supabase.auth.signOut();
      throw redirect({ to: "/login" });
    }

    const { data: isAdmin } = await supabase.rpc("is_admin");
    const { data: settings } = await supabase.rpc("get_public_settings").maybeSingle();

    if (settings?.maintenance_mode && !isAdmin) throw redirect({ to: "/maintenance" });

    return { user: data.user, profile, isAdmin: Boolean(isAdmin) };
  },
  component: () => <Outlet />,
});
