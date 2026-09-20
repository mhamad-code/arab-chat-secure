import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/app/AuthShell";
import { PasswordInput } from "@/components/app/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getSetupStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — المنصة الخاصة" },
      { name: "description", content: "الدخول إلى منصة المراسلة الخاصة بحساب يوفّره المسؤول." },
      { property: "og:title", content: "تسجيل الدخول — المنصة الخاصة" },
      { property: "og:description", content: "الدخول إلى منصة المراسلة الخاصة بحساب يوفّره المسؤول." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setupStatus = useServerFn(getSetupStatus);
  const setup = useQuery({ queryKey: ["setup-status"], queryFn: () => setupStatus(), staleTime: 60_000 });

  const signIn = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) {
        throw new Error(
          error?.message?.toLowerCase().includes("invalid")
            ? "بيانات الدخول غير صحيحة"
            : "تعذّر تسجيل الدخول، يرجى المحاولة لاحقاً",
        );
      }
      const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
      if (!profile || profile.status !== "active") {
        await supabase.auth.signOut();
        throw new Error("هذا الحساب معطّل. يرجى التواصل مع المسؤول.");
      }
      const { data: isAdmin } = await supabase.rpc("is_admin");
      return Boolean(isAdmin);
    },
    onSuccess: (isAdmin) => {
      toast.success("تم تسجيل الدخول");
      navigate({ to: isAdmin ? "/admin" : "/chat", replace: true });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="أدخل بيانات الحساب الذي أنشأه لك المسؤول"
      footer={
        setup.data?.needsSetup ? (
          <Link to="/setup" className="text-primary underline-offset-4 hover:underline">
            لم يتم إعداد المنصة بعد — إنشاء حساب المدير
          </Link>
        ) : null
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim() || !password) {
            toast.error("يرجى إدخال البريد وكلمة المرور");
            return;
          }
          signIn.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">كلمة المرور</Label>
          <PasswordInput
            id="password"
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={signIn.isPending}>
          دخول
        </Button>
        <div className="text-center">
          <Link to="/reset-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            نسيت كلمة المرور؟
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
