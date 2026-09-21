import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { adminReportsQuery, adminStatsQuery, adminUsersQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => ({
    meta: [
      { title: "الأمان — لوحة الإدارة" },
      { name: "description", content: "البلاغات المفتوحة والحسابات الموقوفة وحالة الأمان." },
      { property: "og:title", content: "الأمان — لوحة الإدارة" },
      { property: "og:description", content: "البلاغات المفتوحة والحسابات الموقوفة وحالة الأمان." },
    ],
  }),
  component: AdminSecurityPage,
});

function AdminSecurityPage() {
  const queryClient = useQueryClient();
  const reports = useQuery(adminReportsQuery);
  const stats = useQuery(adminStatsQuery);
  const users = useQuery(adminUsersQuery);

  const nameOf = (id: string | null) =>
    (id ? users.data?.find((u) => u.id === id)?.name : undefined) ?? "—";

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("message_reports").update({ status: "resolved" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تمت معالجة البلاغ");
      void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: () => toast.error("تعذّر تحديث البلاغ"),
  });

  const open = (reports.data ?? []).filter((r) => r.status === "open");
  const disabled = (users.data ?? []).filter((u) => u.status !== "active");

  return (
    <div>
      <PageHeader title="الأمان" description="البلاغات والحسابات الموقوفة" />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs font-medium text-muted-foreground">بلاغات مفتوحة</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{open.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-medium text-muted-foreground">حسابات موقوفة</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{disabled.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-medium text-muted-foreground">حسابات نشطة</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.data?.active_users ?? 0}</p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">البلاغات</h2>
        {reports.isPending ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : !open.length ? (
          <EmptyState icon={ShieldCheck} title="لا بلاغات مفتوحة" description="كل شيء على ما يبدو سليم." />
        ) : (
          <div className="surface-card divide-y divide-border/70 overflow-hidden">
            {open.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.reason}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    بلّغ: {nameOf(r.reported_by)} • {new Date(r.created_at).toLocaleString("ar")}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => resolve.mutate(r.id)}>
                  تمّت المعالجة
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">الحسابات غير النشطة</h2>
        {!disabled.length ? (
          <p className="text-sm text-muted-foreground">لا توجد حسابات موقوفة.</p>
        ) : (
          <div className="surface-card divide-y divide-border/70 overflow-hidden">
            {disabled.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{u.name}</span>
                <span className="text-xs text-muted-foreground">
                  {u.status === "deleted" ? "محذوف" : "معطّل"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        جميع الصلاحيات مطبّقة على مستوى قاعدة البيانات، ولا تعتمد على إخفاء عناصر الواجهة.
      </p>
    </div>
  );
}
