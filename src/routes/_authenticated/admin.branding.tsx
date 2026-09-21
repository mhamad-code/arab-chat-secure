import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { adminSettingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  head: () => ({
    meta: [
      { title: "الهوية والإعدادات — لوحة الإدارة" },
      { name: "description", content: "اسم المنصة، الشعار، المظهر الافتراضي وإعدادات التشغيل." },
      { property: "og:title", content: "الهوية والإعدادات — لوحة الإدارة" },
      { property: "og:description", content: "اسم المنصة، الشعار، المظهر الافتراضي وإعدادات التشغيل." },
    ],
  }),
  component: AdminBrandingPage,
});

function AdminBrandingPage() {
  const queryClient = useQueryClient();
  const settings = useQuery(adminSettingsQuery);

  const [platformName, setPlatformName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultTheme, setDefaultTheme] = useState("system");
  const [maintenance, setMaintenance] = useState(false);
  const [retention, setRetention] = useState(90);

  useEffect(() => {
    const s = settings.data;
    if (s) {
      setPlatformName(s.platform_name);
      setLogoUrl(s.logo_url ?? "");
      setDefaultTheme(s.default_theme);
      setMaintenance(s.maintenance_mode);
      setRetention(s.activity_log_retention_days);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          platform_name: platformName.trim(),
          logo_url: logoUrl.trim() || null,
          default_theme: defaultTheme,
          maintenance_mode: maintenance,
          activity_log_retention_days: retention,
        })
        .eq("id", 1);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: () => toast.error("تعذّر حفظ الإعدادات"),
  });

  if (settings.isPending) {
    return (
      <div>
        <PageHeader title="الهوية والإعدادات" description="اسم المنصة والشعار وإعدادات التشغيل" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="الهوية والإعدادات" description="اسم المنصة والشعار وإعدادات التشغيل" />
      <form
        className="surface-card space-y-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pname">اسم المنصة</Label>
            <Input id="pname" value={platformName} onChange={(e) => setPlatformName(e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo">رابط الشعار (اختياري)</Label>
            <Input id="logo" dir="ltr" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="theme">المظهر الافتراضي</Label>
            <Select value={defaultTheme} onValueChange={setDefaultTheme}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">فاتح</SelectItem>
                <SelectItem value="dark">داكن</SelectItem>
                <SelectItem value="system">حسب النظام</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="retention">مدة حفظ سجل النشاط (يوم)</Label>
            <Input
              id="retention"
              type="number"
              min={7}
              max={730}
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value))}
            />
          </div>
        </div>

        {logoUrl.trim() ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
            <img src={logoUrl} alt="شعار المنصة" className="size-10 rounded-lg object-contain" />
            <span className="text-sm font-medium">{platformName}</span>
          </div>
        ) : null}

        <div className="rounded-xl border border-border/70 p-4">
          <label className="flex items-start justify-between gap-3 text-sm">
            <span>
              <span className="font-medium">وضع الصيانة</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                عند التفعيل يُمنع غير المسؤولين من استخدام التطبيق.
              </span>
            </span>
            <Switch checked={maintenance} onCheckedChange={setMaintenance} />
          </label>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>
            <Save className="size-4" aria-hidden />
            حفظ
          </Button>
        </div>
      </form>
    </div>
  );
}
