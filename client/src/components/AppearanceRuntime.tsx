import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

export function AppearanceRuntime() {
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const settings = setup.data?.settings;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.appearanceFont = "public_sans";

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
      const activeTheme = localStorage.getItem("procurewise.appearanceTheme") || localStorage.getItem("theme");
      if (activeTheme === "dark") {
        root.classList.add("dark");
        root.dataset.appearanceTheme = "dark";
      } else {
        root.classList.remove("dark");
        root.dataset.appearanceTheme = "light";
      }
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [settings]);

  return null;
}
