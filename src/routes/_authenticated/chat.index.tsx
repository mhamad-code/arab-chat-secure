import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { useEffect } from "react";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { UserAvatar } from "@/components/app/UserAvatar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import { conversationsQuery, welcomeQuery } from "@/lib/queries";
import { isOnline, otherParticipant } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "المحادثات — المنصة الخاصة" },
      { name: "description", content: "محادثاتك الخاصة المصرّح بها من المسؤول." },
      { property: "og:title", content: "المحادثات — المنصة الخاصة" },
      { property: "og:description", content: "محادثاتك الخاصة المصرّح بها من المسؤول." },
    ],
  }),
  component: ChatListPage,
});

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "short" });
}

function ChatListPage() {
  const { user, isAdmin, profile } = Route.useRouteContext();
  const queryClient = useQueryClient();
  usePresence(user.id);

  const conversations = useQuery(conversationsQuery);
  const welcome = useQuery(welcomeQuery);

  useEffect(() => {
    const channel = supabase
      .channel("conversation-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="animate-page-in space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">مرحباً {profile.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تظهر هنا المحادثات التي صرّح لك المسؤول بالتواصل من خلالها فقط.
          </p>
        </div>

        {welcome.data?.enabled && (
          <div className="surface-card animate-card-in p-4">
            <p className="text-sm font-semibold">{welcome.data.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{welcome.data.message}</p>
          </div>
        )}

        {conversations.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
            ))}
          </div>
        ) : !conversations.data?.length ? (
          <EmptyState
            icon={MessagesSquare}
            title="لا توجد محادثات بعد"
            description="سيقوم المسؤول بإتاحة المحادثات المصرّح لك بها."
          />
        ) : (
          <ul className="space-y-2">
            {conversations.data.map((conv) => {
              const partner = otherParticipant(conv, user.id);
              const last = conv.messages?.[0];
              return (
                <li key={conv.id}>
                  <Link
                    to="/chat/$conversationId"
                    params={{ conversationId: conv.id }}
                    className="surface-card tactile flex items-center gap-3 p-3.5 transition-colors hover:bg-accent/40"
                  >
                    <UserAvatar
                      name={partner?.name ?? "مستخدم"}
                      avatarUrl={partner?.avatar_url}
                      online={isOnline(partner?.last_seen_at)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{partner?.name ?? "مستخدم"}</p>
                        {conv.status !== "active" && <StatusBadge value={conv.status} />}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {last ? (last.deleted_at ? "تم حذف الرسالة" : last.content) : "لا رسائل بعد"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {relativeTime(last?.created_at ?? conv.last_activity)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
