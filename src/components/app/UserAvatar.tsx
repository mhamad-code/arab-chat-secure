import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  avatarUrl,
  online,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string | null | undefined;
  online?: boolean | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("") || "؟";
  const dim = size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "grid place-items-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground",
          dim,
        )}
        aria-hidden
      >
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
      </div>
      {online && (
        <span
          className="online-dot absolute bottom-0 end-0 ring-2 ring-card"
          aria-label="متصل"
          role="img"
        />
      )}
    </div>
  );
}
