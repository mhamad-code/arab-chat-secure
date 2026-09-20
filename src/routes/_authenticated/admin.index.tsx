import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bell, MessagesSquare, ShieldAlert, UserCheck, UserX, Users, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { adminActivityQuery, adminStatsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — نظرة عامة" },
      { name: "description", content: "إحصاءات المنصة وحالة المستخدمين والمحادثات." },
      { property: "og:title", content: "لوحة الإدارة — نظرة عامة" },
      { property: "og:description", content: "إحصاءات المنصة وحالة المستخدمين والمحادثات." },
    ],
  }),
  component: AdminOverview,
});

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="surface-card animate-card-in p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function AdminOverview() {
  const stats = useQuery(adminStatsQuery);
  const activity = useQuery(adminActivityQuery);

  return (
    <div>
      <PageHeader title="نظرة عامة" description="ملخّص حالة المنصة في الوقت الحالي" />

      {stats.isPending ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-[86px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Users} label="إجمالي المستخدمين" value={stats.data?.total_users ?? 0} />
          <StatCard icon={UserCheck} label="حسابات نشطة" value={stats.data?.active_users ?? 0} />
          <StatCard icon={UserX} label="حسابات معطّلة" value={stats.data?.disabled_users ?? 0} />
          <StatCard icon={Wifi} label="متصلون الآن" value={stats.data?.online_users ?? 0} />
          <StatCard icon={MessagesSquare} label="محادثات نشطة" value={stats.data?.active_conversations ?? 0} />
          <StatCard icon={Activity} label="الرسائل" value={stats.data?.messages ?? 0} />
          <StatCard icon={Bell} label="تنبيهات فعّالة" value={stats.data?.active_alerts ?? 0} />
          <StatCard icon={ShieldAlert} label="بلاغات مفتوحة" value={stats.data?.open_reports ?? 0} />
        </div>
      )}

      <div className="surface-card mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">آخر الأنشطة</p>
          <Link to="/admin/activity" className="text-xs text-primary underline-offset-4 hover:underline">
            عرض السجل الكامل
          </Link>
        </div>
        {activity.isPending ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : !activity.data?.length ? (
          <p className="text-sm text-muted-foreground">لا يوجد نشاط مسجّل بعد.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {activity.data.slice(0, 6).map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate">{log.event_type}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("ar")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
