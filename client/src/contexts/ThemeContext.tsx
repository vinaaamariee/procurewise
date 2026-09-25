import React, { createContext, useContext, useEffect, useState } from "react";
import { disableTransitionsTemporarily } from "@/lib/themeTransitions";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("procurewise.appearanceTheme") || localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") return stored;
      if (document.documentElement.classList.contains("dark") || document.documentElement.dataset.appearanceTheme === "dark") {
        return "dark";
      }
    }
    return defaultTheme;
  });

  useEffect(() => {
    const handleSync = () => {
      if (typeof window === "undefined") return;
      const stored = localStorage.getItem("procurewise.appearanceTheme") || localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
      }
    };
    window.addEventListener("procurewise-theme-change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("procurewise-theme-change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    disableTransitionsTemporarily();
    if (theme === "dark") {
      root.classList.add("dark");
      root.dataset.appearanceTheme = "dark";
    } else {
      root.classList.remove("dark");
      root.dataset.appearanceTheme = "light";
    }

    if (switchable) {
      localStorage.setItem("procurewise.appearanceTheme", theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme((prev) => {
          const next = prev === "light" ? "dark" : "light";
          window.dispatchEvent(new CustomEvent("procurewise-theme-change", { detail: next }));
          return next;
        });
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
