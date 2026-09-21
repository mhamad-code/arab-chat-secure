import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminActivityQuery, adminUsersQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: () => ({
    meta: [
      { title: "سجل النشاط — لوحة الإدارة" },
      { name: "description", content: "سجل الأحداث الإدارية والأمنية على المنصة." },
      { property: "og:title", content: "سجل النشاط — لوحة الإدارة" },
      { property: "og:description", content: "سجل الأحداث الإدارية والأمنية على المنصة." },
    ],
  }),
  component: AdminActivityPage,
});

const LABELS: Record<string, string> = {
  user_created: "إنشاء مستخدم",
  user_updated: "تعديل مستخدم",
  credentials_reset: "إعادة تعيين كلمة المرور",
  user_status_changed: "تغيير حالة حساب",
  admin_bootstrapped: "إعداد المدير الأول",
  conversation_created: "إنشاء محادثة",
  settings_updated: "تحديث الإعدادات",
};

function AdminActivityPage() {
  const activity = useQuery(adminActivityQuery);
  const users = useQuery(adminUsersQuery);
  const [term, setTerm] = useState("");

  const nameOf = useMemo(() => {
    const map = new Map((users.data ?? []).map((u) => [u.id, u.name]));
    return (id: string | null) => (id ? (map.get(id) ?? "—") : "—");
  }, [users.data]);

  const rows = (activity.data ?? []).filter((r) => {
    if (!term.trim()) return true;
    const t = term.trim();
    return (
      (LABELS[r.event_type] ?? r.event_type).includes(t) ||
      nameOf(r.actor_id).includes(t) ||
      nameOf(r.target_id).includes(t)
    );
  });

  return (
    <div>
      <PageHeader title="سجل النشاط" description="أحدث 200 حدث على المنصة" />
      <div className="mb-4 max-w-sm">
        <Input placeholder="بحث في السجل…" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>

      {activity.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState icon={Activity} title="لا أحداث" description="لم يُسجّل أي نشاط مطابق." />
      ) : (
        <div className="surface-card divide-y divide-border/70 overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{LABELS[r.event_type] ?? r.event_type}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  المنفّذ: {nameOf(r.actor_id)}
                  {r.target_id ? ` • الهدف: ${nameOf(r.target_id)}` : ""}
                </p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {new Date(r.created_at).toLocaleString("ar")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
