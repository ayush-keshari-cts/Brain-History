"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

interface ThemeCtx {
  theme:        Theme;
  setTheme:     (t: Theme) => void;
  toggleTheme:  () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<ThemeCtx>({
  theme:       "light",
  setTheme:    () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // On mount: read localStorage or fall back to system preference
  useEffect(() => {
    const stored  = localStorage.getItem("theme") as Theme | null;
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved: Theme = stored ?? (sysDark ? "dark" : "light");
    applyTheme(resolved);
    setThemeState(resolved);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <Ctx.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
}
