import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Current auth user, read from Supabase (never trusted from local state for authorization). */
export function useSession() {
  const query = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user ?? null,
    staleTime: 30_000,
  });
  return { user: query.data ?? null, isPending: query.isPending };
}
