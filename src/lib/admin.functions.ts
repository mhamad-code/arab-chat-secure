import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const userSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(128),
  status: z.enum(["active", "disabled"]).default("active"),
});

async function assertAdmin(supabase: { rpc: (fn: "is_admin") => PromiseLike<{ data: unknown; error: unknown }> }) {
  const { data, error } = await supabase.rpc("is_admin");
  if (error || !data) throw new Error("غير مصرح");
}

/** Admin: create a login-ready user (auth + profile + role). */
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => userSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (created.error || !created.data.user) {
      const msg = created.error?.message ?? "";
      throw new Error(msg.includes("already") ? "هذا البريد مستخدم مسبقاً" : "تعذّر إنشاء المستخدم");
    }
    const uid = created.data.user.id;

    const profile = await supabaseAdmin.from("profiles").insert({ id: uid, name: data.name, status: data.status });
    if (profile.error) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error("تعذّر إنشاء الملف الشخصي");
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "user" });
    await context.supabase.rpc("log_activity", {
      _event_type: "user_created",
      _target_id: uid,
      _metadata: { name: data.name },
    });
    return { id: uid };
  });

/** Admin: update editable user info (name / email). */
export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        name: z.string().trim().min(2).max(60),
        email: z.string().trim().email().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { error } = await context.supabase.from("profiles").update({ name: data.name }).eq("id", data.userId);
    if (error) throw new Error("تعذّر تحديث المستخدم");
    if (data.email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const res = await supabaseAdmin.auth.admin.updateUserById(data.userId, { email: data.email, email_confirm: true });
      if (res.error) throw new Error("تعذّر تحديث البريد الإلكتروني");
    }
    await context.supabase.rpc("log_activity", { _event_type: "user_updated", _target_id: data.userId });
    return { ok: true };
  });

/** Admin: reset a user's credentials and revoke their sessions. */
export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (res.error) throw new Error("تعذّر إعادة تعيين كلمة المرور");
    await supabaseAdmin.auth.admin.signOut(data.userId as never, "global").catch(() => undefined);
    await context.supabase.rpc("log_activity", { _event_type: "credentials_reset", _target_id: data.userId });
    return { ok: true };
  });

/** Admin: set account status (active / disabled / deleted = soft delete). Revokes sessions when blocking. */
export const adminSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), status: z.enum(["active", "disabled", "deleted"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { error } = await context.supabase.rpc("admin_set_user_status", {
      _user_id: data.userId,
      _status: data.status,
    });
    if (error) throw new Error("تعذّر تغيير حالة الحساب");
    if (data.status !== "active") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Ban blocks future logins at the auth layer; RLS blocks data access regardless.
      await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "876000h" });
    } else {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
    }
    return { ok: true };
  });

/** Public: is first-time setup still needed (no admin exists yet)? */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { needsSetup: (count ?? 0) === 0 };
});

/** Public, self-disabling: create the very first Admin. Refuses once any admin exists. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => userSchema.omit({ status: true }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("تم إعداد المنصة مسبقاً");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (created.error || !created.data.user) throw new Error("تعذّر إنشاء حساب المدير");
    const uid = created.data.user.id;
    await supabaseAdmin.from("profiles").insert({ id: uid, name: data.name, status: "active" });
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    await supabaseAdmin.from("activity_log").insert({ event_type: "admin_bootstrapped", actor_id: uid, target_id: uid });
    return { ok: true };
  });
