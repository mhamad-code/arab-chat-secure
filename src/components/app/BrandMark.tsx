import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { publicSettingsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function useBranding() {
  const { data } = useQuery(publicSettingsQuery);
  return {
    name: data?.platform_name ?? "المنصة الخاصة",
    logoUrl: data?.logo_url ?? null,
    maintenance: data?.maintenance_mode ?? false,
    defaultTheme: data?.default_theme ?? "system",
  };
}

export function BrandMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const { name, logoUrl } = useBranding();
  const box = size === "lg" ? "h-16 w-16 rounded-2xl" : size === "sm" ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl";
  const icon = size === "lg" ? "size-8" : size === "sm" ? "size-4" : "size-5";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("grid place-items-center overflow-hidden bg-primary text-primary-foreground shadow-glow", box)}>
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <ShieldCheck className={icon} aria-hidden />
        )}
      </div>
      {size !== "sm" && (
        <span className={cn("font-semibold tracking-tight", size === "lg" ? "text-2xl" : "text-lg")}>{name}</span>
      )}
    </div>
  );
}
