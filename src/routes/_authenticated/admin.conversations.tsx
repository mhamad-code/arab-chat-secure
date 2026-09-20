import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { adminConversationsQuery, adminUsersQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/conversations")({
  head: () => ({
    meta: [
      { title: "المحادثات والصلاحيات — لوحة الإدارة" },
      { name: "description", content: "تحديد من يمكنه التواصل مع من عبر محادثات فردية." },
      { property: "og:title", content: "المحادثات والصلاحيات — لوحة الإدارة" },
      { property: "og:description", content: "تحديد من يمكنه التواصل مع من عبر محادثات فردية." },
    ],
  }),
  component: AdminConversations,
});

function AdminConversations() {
  const queryClient = useQueryClient();
  const users = useQuery(adminUsersQuery);
  const conversations = useQuery(adminConversationsQuery);
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");

  const activeUsers = (users.data ?? []).filter((u) => u.status === "active");

  const createConversation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_create_conversation", { _user_a: userA, _user_b: userB });
      if (error) throw new Error(error.message.includes("duplicate") ? "المحادثة موجودة مسبقاً" : "تعذّر إنشاء المحادثة");
    },
    onSuccess: () => {
      toast.success("تم السماح بالتواصل بين الطرفين");
      setUserA("");
      setUserB("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setConversationStatus = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const { error } = await supabase.from("conversations").update({ status: vars.status }).eq("id", vars.id);
      if (error) throw new Error("تعذّر تحديث المحادثة");
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة المحادثة");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="المحادثات والصلاحيات" description="المستخدمون لا يستطيعون بدء محادثات بأنفسهم" />

      <section className="surface-card mb-6 p-5">
        <p className="text-sm font-semibold">السماح بالتواصل بين مستخدمين</p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!userA || !userB) return toast.error("اختر مستخدمين");
            if (userA === userB) return toast.error("اختر مستخدمين مختلفين");
            createConversation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>الطرف الأول</Label>
            <Select value={userA} onValueChange={setUserA}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مستخدماً" />
              </SelectTrigger>
              <SelectContent>
                {activeUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الطرف الثاني</Label>
            <Select value={userB} onValueChange={setUserB}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مستخدماً" />
              </SelectTrigger>
              <SelectContent>
                {activeUsers
                  .filter((u) => u.id !== userA)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto" loading={createConversation.isPending}>
              إنشاء المحادثة
            </Button>
          </div>
        </form>
      </section>

      {conversations.isPending ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !conversations.data?.length ? (
        <EmptyState icon={MessagesSquare} title="لا محادثات" description="أنشئ أول صلاحية تواصل بين مستخدمين." />
      ) : (
        <ul className="space-y-2">
          {conversations.data.map((c) => {
            const names = c.conversation_participants.map((p) => p.profiles?.name ?? "مستخدم");
            return (
              <li key={c.id} className="surface-card flex flex-wrap items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{names.join(" ↔ ")}</p>
                    <StatusBadge value={c.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    آخر نشاط: {new Date(c.last_activity).toLocaleString("ar")}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {c.status === "active" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConversationStatus.mutate({ id: c.id, status: "read_only" })}
                      >
                        للقراءة فقط
                      </Button>
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => setConversationStatus.mutate({ id: c.id, status: "archived" })}
                      >
                        أرشفة
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => setConversationStatus.mutate({ id: c.id, status: "active" })}
                    >
                      تنشيط
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
