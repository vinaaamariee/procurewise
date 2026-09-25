import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

export function AppearanceRuntime() {
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const settings = setup.data?.settings;

  useEffect(() => {
    const root = document.documentElement;

    const applyCurrentTheme = (override?: "light" | "dark") => {
      let theme: "light" | "dark" = "light";
      if (override) {
        theme = override;
      } else {
        const storedTheme = typeof window !== "undefined" ? localStorage.getItem("procurewise.appearanceTheme") || localStorage.getItem("theme") : null;
        if (storedTheme === "dark" || storedTheme === "light") {
          theme = storedTheme;
        } else if (settings?.appearanceTheme === "dark") {
          theme = "dark";
        }
      }

      root.dataset.appearanceTheme = theme;
      root.dataset.appearanceFont = "public_sans";
      root.classList.toggle("dark", theme === "dark");

      if (typeof window !== "undefined") {
        localStorage.setItem("procurewise.appearanceTheme", theme);
        localStorage.setItem("theme", theme);
      }
    };

    applyCurrentTheme();

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"light" | "dark">;
      applyCurrentTheme(customEvent.detail);
    };

    window.addEventListener("procurewise-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);

    const accents: Record<string, string> = {
      maroon: "oklch(0.37 0.13 27)",
      teal: "oklch(0.45 0.11 180)",
      blue: "oklch(0.42 0.13 255)",
      forest: "oklch(0.39 0.12 145)",
    };
    root.style.setProperty("--primary", accents[settings?.appearanceAccent || "maroon"] || accents.maroon);
    root.style.setProperty("--ring", accents[settings?.appearanceAccent || "maroon"] || accents.maroon);
    root.style.setProperty(
      "--radius",
      settings?.appearanceCorners === "round"
        ? "0.75rem"
        : settings?.appearanceCorners === "soft"
          ? "0.5rem"
          : "0.25rem"
    );

    // Print isolation: force light theme during print preview/printing
    const handleBeforePrint = () => {
      root.classList.remove("dark");
      root.dataset.appearanceTheme = "light";
    };
    const handleAfterPrint = () => {
      applyCurrentTheme();
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("procurewise-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [settings]);

  return null;
}
