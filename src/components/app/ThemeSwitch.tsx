import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "فاتح", icon: Sun },
  { value: "dark", label: "داكن", icon: Moon },
  { value: "system", label: "النظام", icon: Monitor },
];

export function ThemeSwitch({
  onChange,
  compact = false,
}: {
  onChange?: (t: ThemePreference) => void;
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="المظهر"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => {
              setTheme(value);
              onChange?.(value);
            }}
            className={cn(
              "tactile inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
