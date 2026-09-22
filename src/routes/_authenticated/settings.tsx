import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { ThemeSwitch } from "@/components/app/ThemeSwitch";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { myProfileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — المنصة الخاصة" },
      { name: "description", content: "إدارة ملفك الشخصي وتفضيل المظهر." },
      { property: "og:title", content: "الإعدادات — المنصة الخاصة" },
      { property: "og:description", content: "إدارة ملفك الشخصي وتفضيل المظهر." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, isAdmin } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const profile = useQuery(myProfileQuery(user.id));
  const [name, setName] = useState("");

  useEffect(() => {
    if (profile.data) setName(profile.data.name);
  }, [profile.data]);

  const saveName = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", user.id);
      if (error) throw new Error("تعذّر حفظ الاسم");
    },
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const savedTheme = useMutation({
    mutationFn: async (theme: string) => {
      await supabase.from("profiles").update({ theme_preference: theme }).eq("id", user.id);
    },
  });

  return (
    <AppShell isAdmin={isAdmin}>
      <PageHeader title="الإعدادات" description="ملفك الشخصي وتفضيلاتك" />

      <div className="space-y-4">
        <section className="surface-card p-5">
          <div className="flex items-center gap-3">
            <UserAvatar name={profile.data?.name ?? "؟"} avatarUrl={profile.data?.avatar_url} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.data?.name}</p>
              <p dir="ltr" className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length < 2) { toast.error("الاسم قصير جداً"); return; }
              saveName.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="display-name">الاسم المعروض</Label>
              <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" loading={saveName.isPending}>
              حفظ
            </Button>
          </form>
        </section>

        <section className="surface-card p-5">
          <p className="text-sm font-semibold">المظهر</p>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">اختر الوضع الفاتح أو الداكن أو اتباع النظام.</p>
          <ThemeSwitch onChange={(theme) => savedTheme.mutate(theme)} />
        </section>

        <section className="surface-card p-5">
          <p className="text-sm font-semibold">الأمان</p>
          <p className="mt-1 text-sm text-muted-foreground">
            الحسابات والصلاحيات يديرها المسؤول. الرسائل محفوظة بحماية صلاحيات على مستوى قاعدة البيانات، ولا تدّعي
            المنصة تشفيراً طرفياً.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
