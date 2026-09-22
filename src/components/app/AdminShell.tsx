import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MessagesSquare,
  Palette,
  Shield,
  Sliders,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/button";
import { signOutCleanly } from "@/lib/signOut";

const links: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "المستخدمون", icon: Users },
  { to: "/admin/conversations", label: "المحادثات والصلاحيات", icon: MessagesSquare },
  { to: "/admin/alerts", label: "التنبيهات", icon: Bell },
  { to: "/admin/welcome", label: "رسالة الترحيب", icon: MessageSquare },
  { to: "/admin/branding", label: "الهوية والإعدادات", icon: Palette },
  { to: "/admin/security", label: "الأمان", icon: Shield },
  { to: "/admin/activity", label: "سجل النشاط", icon: Activity },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logout = async () => {
    await signOutCleanly(queryClient);
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="ambient-bg min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" />
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">
              <Sliders className="size-3.5" aria-hidden />
              الإدارة
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/chat">محادثاتي</Link>
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="تسجيل الخروج" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-2 lg:hidden">
          <div className="scrollbar-thin flex gap-1 overflow-x-auto pb-2">
            {links.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: Boolean(exact) }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="tactile inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-1">
            {links.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: Boolean(exact) }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="tactile flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="animate-page-in min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
