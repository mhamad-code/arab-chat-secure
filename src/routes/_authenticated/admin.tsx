import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    // Role comes from the database (is_admin) in the parent gate, never from client state.
    if (!context.isAdmin) throw redirect({ to: "/chat" });
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
