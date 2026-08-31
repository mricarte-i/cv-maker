import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

const KEY = "cv-maker:theme";
const ORDER: Theme[] = ["system", "light", "dark"];

const stored = (): Theme => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(stored);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && media.matches),
      );
    apply();

    // only "system" has to keep listening
    if (theme !== "system") {
      return;
    }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // a failed preference write is not worth interrupting anyone over
    }
    setTheme(next);
  };

  return { theme, cycle };
}
