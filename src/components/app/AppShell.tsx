import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, MessageSquare, Settings, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/button";
import { signOutCleanly } from "@/lib/signOut";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/chat", label: "المحادثات", icon: MessageSquare },
  { to: "/alerts", label: "التنبيهات", icon: Bell },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export function AppShell({
  children,
  isAdmin = false,
  contained = true,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  contained?: boolean;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logout = async () => {
    await signOutCleanly(queryClient);
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="ambient-bg flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/chat" className="tactile rounded-lg">
            <BrandMark size="sm" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {tabs.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="tactile inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin">
                  <ShieldCheck className="size-4" aria-hidden />
                  <span className="hidden sm:inline">لوحة الإدارة</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" aria-label="تسجيل الخروج" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("flex-1", contained && "mx-auto w-full max-w-5xl px-4 py-5")}>{children}</main>

      <nav
        aria-label="التنقل الرئيسي"
        className="sticky bottom-0 z-20 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="flex items-stretch">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="tactile flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
