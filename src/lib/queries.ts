import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ActivityLog,
  AdminStats,
  Alert,
  ConversationWithMeta,
  Message,
  MessageReport,
  PlatformSettings,
  Profile,
  PublicSettings,
  WelcomeMessage,
} from "./types";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new Error("لم يتم العثور على البيانات");
  return res.data;
}

export const publicSettingsQuery = queryOptions({
  queryKey: ["public-settings"],
  queryFn: async (): Promise<PublicSettings> => {
    const res = await supabase.rpc("get_public_settings").single();
    return unwrap(res) as PublicSettings;
  },
  staleTime: 60_000,
});

export const myProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile> =>
      unwrap(await supabase.from("profiles").select("*").eq("id", userId).single()),
  });

export const isAdminQuery = queryOptions({
  queryKey: ["is-admin"],
  queryFn: async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc("is_admin");
    if (error) throw new Error(error.message);
    return Boolean(data);
  },
  staleTime: 5 * 60_000,
});

export const conversationsQuery = queryOptions({
  queryKey: ["conversations"],
  queryFn: async (): Promise<ConversationWithMeta[]> =>
    unwrap(
      await supabase
        .from("conversations")
        .select(
          "*, conversation_participants(user_id, profiles(id,name,avatar_url,last_seen_at,status)), messages(content,created_at,sender_id,status,deleted_at)",
        )
        .order("last_activity", { ascending: false })
        .order("created_at", { referencedTable: "messages", ascending: false })
        .limit(1, { referencedTable: "messages" }),
    ) as ConversationWithMeta[],
});

export const conversationQuery = (id: string) =>
  queryOptions({
    queryKey: ["conversation", id],
    queryFn: async (): Promise<ConversationWithMeta> =>
      unwrap(
        await supabase
          .from("conversations")
          .select(
            "*, conversation_participants(user_id, profiles(id,name,avatar_url,last_seen_at,status)), messages(content,created_at,sender_id,status,deleted_at)",
          )
          .eq("id", id)
          .limit(1, { referencedTable: "messages" })
          .single(),
      ) as ConversationWithMeta,
  });

export const messagesQuery = (conversationId: string) =>
  queryOptions({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<Message[]> =>
      unwrap(
        await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(300),
      ),
  });

export const welcomeQuery = queryOptions({
  queryKey: ["welcome"],
  queryFn: async (): Promise<WelcomeMessage> =>
    unwrap(await supabase.from("welcome_message").select("*").eq("id", 1).single()),
});

export const visibleAlertsQuery = queryOptions({
  queryKey: ["alerts", "visible"],
  queryFn: async (): Promise<Alert[]> =>
    unwrap(await supabase.from("alerts").select("*").order("created_at", { ascending: false })),
});

// ---------- Admin ----------
export const adminStatsQuery = queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: async (): Promise<AdminStats> => {
    const { data, error } = await supabase.rpc("admin_stats");
    if (error) throw new Error(error.message);
    return data as unknown as AdminStats;
  },
});

export const adminUsersQuery = queryOptions({
  queryKey: ["admin", "users"],
  queryFn: async (): Promise<Profile[]> =>
    unwrap(await supabase.from("profiles").select("*").order("created_at", { ascending: false })),
});

export const adminConversationsQuery = queryOptions({
  queryKey: ["admin", "conversations"],
  queryFn: async (): Promise<ConversationWithMeta[]> =>
    unwrap(
      await supabase
        .from("conversations")
        .select(
          "*, conversation_participants(user_id, profiles(id,name,avatar_url,last_seen_at,status)), messages(content,created_at,sender_id,status,deleted_at)",
        )
        .order("last_activity", { ascending: false })
        .limit(1, { referencedTable: "messages" }),
    ) as ConversationWithMeta[],
});

export type AlertWithTargets = Alert & { alert_targets: { user_id: string }[] };

export const adminAlertsQuery = queryOptions({
  queryKey: ["admin", "alerts"],
  queryFn: async (): Promise<AlertWithTargets[]> =>
    unwrap(
      await supabase
        .from("alerts")
        .select("*, alert_targets(user_id)")
        .order("created_at", { ascending: false }),
    ) as AlertWithTargets[],
});

export const adminSettingsQuery = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: async (): Promise<PlatformSettings> =>
    unwrap(await supabase.from("platform_settings").select("*").eq("id", 1).single()),
});

export const adminActivityQuery = queryOptions({
  queryKey: ["admin", "activity"],
  queryFn: async (): Promise<ActivityLog[]> =>
    unwrap(
      await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ),
});

export const adminReportsQuery = queryOptions({
  queryKey: ["admin", "reports"],
  queryFn: async (): Promise<MessageReport[]> =>
    unwrap(
      await supabase
        .from("message_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ),
});
