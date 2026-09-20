import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, SendHorizonal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { MessageStatus } from "@/components/app/MessageStatus";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import { conversationQuery, messagesQuery } from "@/lib/queries";
import { isOnline, otherParticipant } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  head: () => ({
    meta: [
      { title: "محادثة خاصة — المنصة الخاصة" },
      { name: "description", content: "محادثة فردية خاصة بين طرفين مصرّح لهما." },
      { property: "og:title", content: "محادثة خاصة — المنصة الخاصة" },
      { property: "og:description", content: "محادثة فردية خاصة بين طرفين مصرّح لهما." },
    ],
  }),
  component: ChatRoomPage,
});

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
}

function ChatRoomPage() {
  const { conversationId } = Route.useParams();
  const { user, isAdmin } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  usePresence(user.id);

  const conversation = useQuery(conversationQuery(conversationId));
  const messages = useQuery(messagesQuery(conversationId));
  const partner = conversation.data ? otherParticipant(conversation.data, user.id) : null;
  const readOnly = conversation.data ? conversation.data.status !== "active" : false;

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
          void supabase.rpc("mark_conversation_read", { _conversation_id: conversationId });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    void supabase.rpc("mark_conversation_read", { _conversation_id: conversationId });
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        type: "text",
      });
      if (error) throw new Error("تعذّر إرسال الرسالة");
    },
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error("لا يمكن حذف هذه الرسالة");
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] }),
    onError: (error: Error) => toast.error(error.message),
  });

  if (conversation.isError) {
    return (
      <AppShell isAdmin={isAdmin}>
        <div className="surface-card p-6 text-center">
          <Lock className="mx-auto size-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-semibold">لا تملك صلاحية الوصول لهذه المحادثة</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/chat">العودة للمحادثات</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell isAdmin={isAdmin} contained={false}>
      <div className="mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-3xl flex-col md:h-[calc(100dvh-3.5rem)]">
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
          <Button asChild variant="ghost" size="icon-sm" aria-label="رجوع">
            <Link to="/chat">
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {conversation.isPending ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <>
              <UserAvatar
                name={partner?.name ?? "مستخدم"}
                avatarUrl={partner?.avatar_url}
                online={isOnline(partner?.last_seen_at)}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{partner?.name ?? "مستخدم"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {isOnline(partner?.last_seen_at) ? "متصل الآن" : "غير متصل"}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {messages.isPending ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-2/3 rounded-2xl" />
              ))}
            </div>
          ) : !messages.data?.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">ابدأ المحادثة بإرسال رسالة</p>
          ) : (
            messages.data.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "animate-message-in group relative max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-soft",
                      mine
                        ? "rounded-es-md bg-primary text-primary-foreground"
                        : "rounded-ee-md bg-card text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {m.deleted_at ? (
                        <span className="italic opacity-70">تم حذف هذه الرسالة</span>
                      ) : (
                        m.content
                      )}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] opacity-75">
                      <span>{timeLabel(m.created_at)}</span>
                      {mine && !m.deleted_at && <MessageStatus status={m.status} />}
                      {mine && !m.deleted_at && (
                        <button
                          type="button"
                          aria-label="حذف الرسالة"
                          onClick={() => removeMessage.mutate(m.id)}
                          className="tactile opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {readOnly ? (
          <div className="border-t border-border/70 px-4 py-4 text-center text-xs text-muted-foreground">
            هذه المحادثة للقراءة فقط
          </div>
        ) : (
          <form
            className="flex items-end gap-2 border-t border-border/70 px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              const content = draft.trim();
              if (!content) return;
              send.mutate(content);
            }}
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const content = draft.trim();
                  if (content) send.mutate(content);
                }
              }}
              rows={1}
              placeholder="اكتب رسالة…"
              aria-label="نص الرسالة"
              className="max-h-32 min-h-10 resize-none"
            />
            <Button type="submit" size="icon" aria-label="إرسال" loading={send.isPending}>
              {!send.isPending && <SendHorizonal className="size-4" />}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
