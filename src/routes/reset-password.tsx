import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/app/AuthShell";
import { PasswordInput } from "@/components/app/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور — المنصة الخاصة" },
      { name: "description", content: "طلب رابط إعادة تعيين كلمة المرور أو تعيين كلمة مرور جديدة." },
      { property: "og:title", content: "إعادة تعيين كلمة المرور — المنصة الخاصة" },
      { property: "og:description", content: "طلب رابط إعادة تعيين كلمة المرور أو تعيين كلمة مرور جديدة." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const requestLink = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error("تعذّر إرسال الرابط، يرجى المحاولة لاحقاً");
    },
    onSuccess: () => toast.success("إن كان البريد مسجّلاً فسيصلك رابط إعادة التعيين"),
    onError: (error: Error) => toast.error(error.message),
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error("تعذّر تحديث كلمة المرور");
      await supabase.auth.signOut({ scope: "global" });
    },
    onSuccess: () => {
      toast.success("تم تحديث كلمة المرور، سجّل الدخول من جديد");
      navigate({ to: "/login", replace: true });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (recovery) {
    return (
      <AuthShell title="كلمة مرور جديدة" subtitle="اختر كلمة مرور قوية لحسابك">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (password.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
            updatePassword.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
            <PasswordInput
              id="new-password"
              dir="ltr"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" loading={updatePassword.isPending}>
            حفظ كلمة المرور
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="إعادة تعيين كلمة المرور"
      subtitle="سنرسل رابطاً إلى بريدك الإلكتروني"
      footer={
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          العودة لتسجيل الدخول
        </Link>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return toast.error("أدخل بريدك الإلكتروني");
          requestLink.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="reset-email">البريد الإلكتروني</Label>
          <Input
            id="reset-email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={requestLink.isPending}>
          إرسال الرابط
        </Button>
      </form>
    </AuthShell>
  );
}
