import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { PasswordInput } from "@/components/app/PasswordInput";
import { StatusBadge } from "@/components/app/StatusBadge";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminCreateUser, adminResetPassword, adminSetUserStatus, adminUpdateUser } from "@/lib/admin.functions";
import { adminUsersQuery } from "@/lib/queries";
import { isOnline } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "إدارة المستخدمين — لوحة الإدارة" },
      { name: "description", content: "إنشاء الحسابات وتعطيلها وإعادة تعيين كلمات المرور." },
      { property: "og:title", content: "إدارة المستخدمين — لوحة الإدارة" },
      { property: "og:description", content: "إنشاء الحسابات وتعطيلها وإعادة تعيين كلمات المرور." },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const queryClient = useQueryClient();
  const users = useQuery(adminUsersQuery);
  const createFn = useServerFn(adminCreateUser);
  const updateFn = useServerFn(adminUpdateUser);
  const statusFn = useServerFn(adminSetUserStatus);
  const resetFn = useServerFn(adminResetPassword);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const create = useMutation({
    mutationFn: async () =>
      createFn({ data: { name: form.name.trim(), email: form.email.trim(), password: form.password, status: "active" } }),
    onSuccess: () => {
      toast.success("تم إنشاء الحساب");
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر إنشاء الحساب"),
  });

  const setStatus = useMutation({
    mutationFn: async (vars: { userId: string; status: "active" | "disabled" | "deleted" }) =>
      statusFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تحديث حالة الحساب");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر تحديث الحالة"),
  });

  const resetPassword = useMutation({
    mutationFn: async () => resetFn({ data: { userId: resetTarget!.id, password: newPassword } }),
    onSuccess: () => {
      toast.success("تم إعادة تعيين كلمة المرور وإلغاء جلسات المستخدم");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر إعادة التعيين"),
  });

  const rename = useMutation({
    mutationFn: async () => updateFn({ data: { userId: renameTarget!.id, name: renameValue.trim() } }),
    onSuccess: () => {
      toast.success("تم تحديث الاسم");
      setRenameTarget(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر التحديث"),
  });

  return (
    <div>
      <PageHeader
        title="المستخدمون"
        description="لا يوجد تسجيل عام — الحسابات يُنشئها المسؤول فقط"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" aria-hidden />
                مستخدم جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء مستخدم</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (form.name.trim().length < 2) return toast.error("الاسم قصير جداً");
                  if (!form.email.trim()) return toast.error("أدخل بريداً إلكترونياً");
                  if (form.password.length < 8) return toast.error("كلمة المرور 8 أحرف على الأقل");
                  create.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">الاسم</Label>
                  <Input id="new-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">البريد الإلكتروني</Label>
                  <Input
                    id="new-email"
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-pass">كلمة المرور المؤقتة</Label>
                  <PasswordInput
                    id="new-pass"
                    dir="ltr"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" loading={create.isPending}>
                  إنشاء الحساب
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {users.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !users.data?.length ? (
        <EmptyState icon={Users} title="لا مستخدمين بعد" description="أنشئ أول حساب مستخدم للبدء." />
      ) : (
        <ul className="space-y-2">
          {users.data.map((u) => (
            <li key={u.id} className="surface-card flex flex-wrap items-center gap-3 p-3.5">
              <UserAvatar name={u.name} avatarUrl={u.avatar_url} online={isOnline(u.last_seen_at)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{u.name}</p>
                  <StatusBadge value={u.role} />
                  <StatusBadge value={u.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  أُنشئ في {new Date(u.created_at).toLocaleDateString("ar")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRenameTarget({ id: u.id, name: u.name });
                    setRenameValue(u.name);
                  }}
                >
                  تعديل
                </Button>
                <Button variant="outline" size="sm" onClick={() => setResetTarget({ id: u.id, name: u.name })}>
                  <KeyRound className="size-3.5" aria-hidden />
                  كلمة المرور
                </Button>
                {u.status === "active" ? (
                  <Button
                    variant="soft"
                    size="sm"
                    loading={setStatus.isPending}
                    onClick={() => setStatus.mutate({ userId: u.id, status: "disabled" })}
                  >
                    تعطيل
                  </Button>
                ) : (
                  <Button
                    variant="soft"
                    size="sm"
                    loading={setStatus.isPending}
                    onClick={() => setStatus.mutate({ userId: u.id, status: "active" })}
                  >
                    تنشيط
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(resetTarget)} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة مرور {resetTarget?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (newPassword.length < 8) return toast.error("كلمة المرور 8 أحرف على الأقل");
              resetPassword.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="reset-pass">كلمة المرور الجديدة</Label>
              <PasswordInput
                id="reset-pass"
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" loading={resetPassword.isPending}>
              تعيين وإلغاء الجلسات
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (renameValue.trim().length < 2) return toast.error("الاسم قصير جداً");
              rename.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="rename">الاسم</Label>
              <Input id="rename" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" loading={rename.isPending}>
              حفظ
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
