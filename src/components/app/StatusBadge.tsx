import { cn } from "@/lib/utils";

const map: Record<string, { label: string; cls: string }> = {
  active: { label: "نشط", cls: "bg-success/12 text-success" },
  disabled: { label: "معطّل", cls: "bg-warning/15 text-warning-foreground dark:text-warning" },
  deleted: { label: "محذوف", cls: "bg-destructive/12 text-destructive" },
  read_only: { label: "للقراءة فقط", cls: "bg-muted text-muted-foreground" },
  archived: { label: "مؤرشفة", cls: "bg-muted text-muted-foreground" },
  info: { label: "معلومة", cls: "bg-info/12 text-info" },
  success: { label: "نجاح", cls: "bg-success/12 text-success" },
  warning: { label: "تحذير", cls: "bg-warning/15 text-warning-foreground dark:text-warning" },
  important: { label: "مهم", cls: "bg-destructive/12 text-destructive" },
  open: { label: "مفتوح", cls: "bg-warning/15 text-warning-foreground dark:text-warning" },
  reviewed: { label: "تمت المراجعة", cls: "bg-success/12 text-success" },
  dismissed: { label: "مرفوض", cls: "bg-muted text-muted-foreground" },
  admin: { label: "مدير", cls: "bg-primary/12 text-primary" },
  user: { label: "مستخدم", cls: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const m = map[value] ?? { label: value, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", m.cls, className)}>
      {m.label}
    </span>
  );
}
