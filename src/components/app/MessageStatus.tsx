import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  sending: "جارٍ الإرسال",
  sent: "تم الإرسال",
  delivered: "تم التسليم",
  read: "تمت القراءة",
  failed: "فشل الإرسال",
};

export function MessageStatus({ status, className }: { status: string; className?: string }) {
  const Icon =
    status === "sending" ? Clock : status === "failed" ? AlertCircle : status === "sent" ? Check : CheckCheck;
  return (
    <span
      className={cn(
        "inline-flex items-center transition-colors duration-300",
        status === "read" && "text-primary-foreground",
        status === "failed" && "text-destructive",
        className,
      )}
      role="img"
      aria-label={labels[status] ?? status}
      title={labels[status] ?? status}
    >
      <Icon className={cn("size-3.5", status === "read" ? "opacity-100" : "opacity-70")} aria-hidden />
    </span>
  );
}
