import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

const INFO_STYLE = { icon: Info, cls: "border-info/30 bg-info/8 text-foreground [&_svg]:text-info" };

const styles: Record<string, { icon: typeof Info; cls: string }> = {
  info: INFO_STYLE,
  success: { icon: CheckCircle2, cls: "border-success/30 bg-success/8 [&_svg]:text-success" },
  warning: { icon: AlertTriangle, cls: "border-warning/40 bg-warning/10 [&_svg]:text-warning" },
  important: { icon: ShieldAlert, cls: "border-destructive/40 bg-destructive/8 [&_svg]:text-destructive" },
};

export function AlertCard({
  alert,
  onDismiss,
  className,
}: {
  alert: Pick<Alert, "id" | "title" | "message" | "type" | "dismissible">;
  onDismiss?: () => void;
  className?: string;
}) {
  const s = styles[alert.type] ?? INFO_STYLE;
  const Icon = s.icon;
  return (
    <div
      role={alert.type === "important" ? "alert" : "status"}
      className={cn("animate-card-in flex items-start gap-3 rounded-xl border p-3.5 shadow-soft", s.cls, className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{alert.title}</p>
        <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{alert.message}</p>
      </div>
      {alert.dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق التنبيه"
          className="tactile -m-1 rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
