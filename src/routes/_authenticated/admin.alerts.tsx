import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BellOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminAlertsQuery, adminUsersQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/alerts")({
  head: () => ({
    meta: [
      { title: "التنبيهات — لوحة الإدارة" },
      { name: "description", content: "إنشاء وإدارة تنبيهات المنصة الموجّهة للمستخدمين." },
      { property: "og:title", content: "التنبيهات — لوحة الإدارة" },
      { property: "og:description", content: "إنشاء وإدارة تنبيهات المنصة الموجّهة للمستخدمين." },
    ],
  }),
  component: AdminAlertsPage,
});

const TYPES = [
  { value: "info", label: "معلومة" },
  { value: "warning", label: "تحذير" },
  { value: "success", label: "نجاح" },
  { value: "error", label: "خطأ" },
];

function AdminAlertsPage() {
  const queryClient = useQueryClient();
  const alerts = useQuery(adminAlertsQuery);
  const users = useQuery(adminUsersQuery);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [scope, setScope] = useState<"everyone" | "multiple">("everyone");
  const [dismissible, setDismissible] = useState(true);
  const [expiration, setExpiration] = useState("");
  const [targets, setTargets] = useState<string[]>([]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] });
    void queryClient.invalidateQueries({ queryKey: ["alerts"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .insert({
          title: title.trim(),
          message: message.trim(),
          type,
          target_scope: scope,
          dismissible,
          expiration_time: expiration ? new Date(expiration).toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (scope === "multiple" && targets.length) {
        const rows = targets.map((user_id) => ({ alert_id: data.id, user_id }));
        const res = await supabase.from("alert_targets").insert(rows);
        if (res.error) throw new Error(res.error.message);
      }
    },
    onSuccess: () => {
      toast.success("تم إنشاء التنبيه");
      setTitle("");
      setMessage("");
      setTargets([]);
      setExpiration("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر إنشاء التنبيه"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("alerts").update({ active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: () => toast.error("تعذّر تحديث التنبيه"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم حذف التنبيه");
      invalidate();
    },
    onError: () => toast.error("تعذّر حذف التنبيه"),
  });

  const canSubmit = title.trim().length >= 2 && message.trim().length >= 2;

  return (
    <div>
      <PageHeader title="التنبيهات" description="أرسل تنبيهات للجميع أو لمستخدمين محدّدين" />

      <form
        className="surface-card space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) create.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="alert-title">العنوان</Label>
            <Input id="alert-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alert-type">النوع</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="alert-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="alert-message">نص التنبيه</Label>
          <Textarea
            id="alert-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="alert-scope">الجهة المستهدفة</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "everyone" | "multiple")}>
              <SelectTrigger id="alert-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">جميع المستخدمين</SelectItem>
                <SelectItem value="multiple">مستخدمون محدّدون</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alert-exp">تاريخ الانتهاء (اختياري)</Label>
            <Input
              id="alert-exp"
              type="datetime-local"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
            />
          </div>
        </div>

        {scope === "multiple" && (
          <div className="space-y-2 rounded-xl border border-border/70 p-3">
            <p className="text-xs font-medium text-muted-foreground">اختر المستخدمين</p>
            <div className="scrollbar-thin max-h-44 space-y-1.5 overflow-y-auto">
              {(users.data ?? []).map((u) => (
                <label key={u.id} className="tactile flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                  <Checkbox
                    checked={targets.includes(u.id)}
                    onCheckedChange={(checked) =>
                      setTargets((prev) => (checked ? [...prev, u.id] : prev.filter((x) => x !== u.id)))
                    }
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={dismissible} onCheckedChange={setDismissible} />
            يمكن للمستخدم إخفاؤه
          </label>
          <Button type="submit" disabled={!canSubmit} loading={create.isPending}>
            <Plus className="size-4" aria-hidden />
            إنشاء التنبيه
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {alerts.isPending ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : !(alerts.data ?? []).length ? (
          <EmptyState icon={BellOff} title="لا تنبيهات" description="لم يتم إنشاء أي تنبيه بعد." />
        ) : (
          (alerts.data ?? []).map((a) => (
            <div key={a.id} className="surface-card animate-card-in p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.target_scope === "everyone"
                      ? "الجميع"
                      : `${a.alert_targets?.length ?? 0} مستخدم`}
                    {a.expiration_time
                      ? ` • ينتهي ${new Date(a.expiration_time).toLocaleString("ar")}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={a.active}
                    aria-label="تفعيل التنبيه"
                    onCheckedChange={(active) => toggle.mutate({ id: a.id, active })}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="حذف التنبيه"
                    onClick={() => remove.mutate(a.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
