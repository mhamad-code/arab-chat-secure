import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Ordered sign-out: stop queries, drop cached private data, clear session. */
export async function signOutCleanly(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}
