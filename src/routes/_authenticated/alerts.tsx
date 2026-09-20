import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BellOff } from "lucide-react";
import { useState } from "react";
import { AlertCard } from "@/components/app/AlertCard";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { visibleAlertsQuery } from "@/lib/queries";

const DISMISSED_KEY = "pc-dismissed-alerts";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "التنبيهات — المنصة الخاصة" },
      { name: "description", content: "تنبيهات وإشعارات المنصة الموجّهة إليك من المسؤول." },
      { property: "og:title", content: "التنبيهات — المنصة الخاصة" },
      { property: "og:description", content: "تنبيهات وإشعارات المنصة الموجّهة إليك من المسؤول." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { isAdmin } = Route.useRouteContext();
  const alerts = useQuery(visibleAlertsQuery);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
    } catch {
      return [];
    }
  });

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  const visible = (alerts.data ?? []).filter((a) => !dismissed.includes(a.id));

  return (
    <AppShell isAdmin={isAdmin}>
      <PageHeader title="التنبيهات" description="إشعارات المنصة الموجّهة إليك" />
      {alerts.isPending ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !visible.length ? (
        <EmptyState icon={BellOff} title="لا تنبيهات حالياً" description="سيظهر هنا أي تنبيه يرسله المسؤول." />
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <AlertCard key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
