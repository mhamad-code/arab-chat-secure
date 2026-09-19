import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;
export type Alert = Tables<"alerts">;
export type WelcomeMessage = Tables<"welcome_message">;
export type PlatformSettings = Tables<"platform_settings">;
export type ActivityLog = Tables<"activity_log">;
export type MessageReport = Tables<"message_reports">;

export type PublicProfile = Pick<Profile, "id" | "name" | "avatar_url" | "last_seen_at" | "status">;

export type PublicSettings = {
  platform_name: string;
  logo_url: string | null;
  default_theme: string;
  maintenance_mode: boolean;
};

export type ConversationWithMeta = Conversation & {
  conversation_participants: { user_id: string; profiles: PublicProfile | null }[];
  messages: Pick<Message, "content" | "created_at" | "sender_id" | "status" | "deleted_at">[];
};

export type AdminStats = {
  total_users: number;
  active_users: number;
  disabled_users: number;
  online_users: number;
  active_conversations: number;
  messages: number;
  active_alerts: number;
  open_reports: number;
};

export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(lastSeen: string | null | undefined) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

export function otherParticipant(conv: ConversationWithMeta, myId: string): PublicProfile | null {
  const p = conv.conversation_participants.find((x) => x.user_id !== myId);
  return p?.profiles ?? null;
}
