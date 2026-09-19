import { useCallback, useEffect, useState } from "react";
import { applyTheme, readStoredTheme, type ThemePreference } from "@/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    setThemeState(readStoredTheme());
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredTheme() === "system") applyTheme("system", false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((pref: ThemePreference) => {
    setThemeState(pref);
    applyTheme(pref);
  }, []);

  return { theme, setTheme };
}
