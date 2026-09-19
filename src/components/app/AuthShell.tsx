import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { ThemeSwitch } from "./ThemeSwitch";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="ambient-bg flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4">
        <BrandMark size="sm" />
        <ThemeSwitch compact />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="animate-page-in w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandMark size="lg" className="flex-col gap-4" />
            <h1 className="mt-6 text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="surface-card p-6">{children}</div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            اتصال آمن · الوصول بدعوة من المسؤول فقط
          </p>
          {footer && <div className="mt-3 text-center text-sm">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
