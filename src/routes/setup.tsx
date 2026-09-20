import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/app/AuthShell";
import { PasswordInput } from "@/components/app/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrapAdmin, getSetupStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/setup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إعداد المنصة — إنشاء حساب المدير" },
      { name: "description", content: "خطوة إعداد أولية لإنشاء حساب المدير الأول للمنصة." },
      { property: "og:title", content: "إعداد المنصة — إنشاء حساب المدير" },
      { property: "og:description", content: "خطوة إعداد أولية لإنشاء حساب المدير الأول للمنصة." },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const statusFn = useServerFn(getSetupStatus);
  const createAdmin = useServerFn(bootstrapAdmin);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const status = useQuery({ queryKey: ["setup-status"], queryFn: () => statusFn() });

  const submit = useMutation({
    mutationFn: async () =>
      createAdmin({
        data: { name: form.name.trim(), email: form.email.trim(), password: form.password },
      }),
    onSuccess: () => {
      toast.success("تم إنشاء حساب المدير، يمكنك تسجيل الدخول الآن");
      navigate({ to: "/login", replace: true });
    },
    onError: (error: Error) => toast.error(error.message || "تعذّر إكمال الإعداد"),
  });

  if (status.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  if (!status.data?.needsSetup) {
    return (
      <AuthShell title="تم إعداد المنصة" subtitle="حساب المدير موجود مسبقاً">
        <Button className="w-full" onClick={() => navigate({ to: "/login", replace: true })}>
          الانتقال لتسجيل الدخول
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="إعداد المنصة" subtitle="أنشئ حساب المدير الأول — تُغلق هذه الخطوة تلقائياً بعد إتمامها">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim().length < 2) return toast.error("الاسم قصير جداً");
          if (!form.email.trim()) return toast.error("أدخل بريداً إلكترونياً");
          if (form.password.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
          submit.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">الاسم الكامل</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">كلمة المرور</Label>
          <PasswordInput
            id="password"
            dir="ltr"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={submit.isPending}>
          إنشاء حساب المدير
        </Button>
      </form>
    </AuthShell>
  );
}
