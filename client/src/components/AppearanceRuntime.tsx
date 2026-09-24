import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

export function AppearanceRuntime() {
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const settings = setup.data?.settings;
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.dataset.appearanceTheme = settings.appearanceTheme || "light";
    root.dataset.appearanceFont = settings.appearanceFont || "system";
    root.dataset.appearanceDensity = settings.appearanceDensity || "comfortable";
    root.dataset.appearanceAccent = settings.appearanceAccent || "maroon";
    root.dataset.appearanceCorners = settings.appearanceCorners || "sharp";
    root.dataset.appearanceReducedMotion = settings.appearanceReducedMotion ? "true" : "false";
    root.style.fontSize = `${Number(settings.appearanceFontScale || "100") / 100}em`;
    const accents: Record<string, string> = { maroon: "oklch(0.37 0.13 27)", teal: "oklch(0.45 0.11 180)", blue: "oklch(0.42 0.13 255)", forest: "oklch(0.39 0.12 145)" };
    root.style.setProperty("--primary", accents[settings.appearanceAccent || "maroon"] || accents.maroon);
    root.style.setProperty("--ring", accents[settings.appearanceAccent || "maroon"] || accents.maroon);
    root.style.setProperty("--radius", settings.appearanceCorners === "round" ? "0.75rem" : settings.appearanceCorners === "soft" ? "0.5rem" : "0.2rem");
    return () => { root.style.fontSize = ""; };
  }, [settings]);
  return null;
}
