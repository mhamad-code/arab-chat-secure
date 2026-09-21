import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { welcomeQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/welcome")({
  head: () => ({
    meta: [
      { title: "رسالة الترحيب — لوحة الإدارة" },
      { name: "description", content: "تحرير رسالة الترحيب التي تظهر للمستخدمين عند الدخول." },
      { property: "og:title", content: "رسالة الترحيب — لوحة الإدارة" },
      { property: "og:description", content: "تحرير رسالة الترحيب التي تظهر للمستخدمين عند الدخول." },
    ],
  }),
  component: AdminWelcomePage,
});

function AdminWelcomePage() {
  const queryClient = useQueryClient();
  const welcome = useQuery(welcomeQuery);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (welcome.data) {
      setTitle(welcome.data.title);
      setMessage(welcome.data.message);
      setEnabled(welcome.data.enabled);
    }
  }, [welcome.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("welcome_message")
        .update({ title: title.trim(), message: message.trim(), enabled })
        .eq("id", 1);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم حفظ رسالة الترحيب");
      void queryClient.invalidateQueries({ queryKey: ["welcome"] });
    },
    onError: () => toast.error("تعذّر الحفظ"),
  });

  if (welcome.isPending) {
    return (
      <div>
        <PageHeader title="رسالة الترحيب" description="تظهر للمستخدمين في شاشة المحادثات" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="رسالة الترحيب" description="تظهر للمستخدمين في شاشة المحادثات" />
      <form
        className="surface-card space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          إظهار رسالة الترحيب
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="w-title">العنوان</Label>
          <Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-message">النص</Label>
          <Textarea
            id="w-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={600}
          />
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
          <p className="text-xs font-medium text-muted-foreground">معاينة</p>
          <p className="mt-2 font-semibold">{title || "العنوان"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{message || "النص"}</p>
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
