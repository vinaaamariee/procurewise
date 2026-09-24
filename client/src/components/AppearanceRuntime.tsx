import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

export function AppearanceRuntime() {
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const settings = setup.data?.settings;
  useEffect(() => {
    const root = document.documentElement;
    const theme = settings?.appearanceTheme === "dark" ? "dark" : "light";
    const fontScale = settings?.appearanceFontScale === "120" ? "120" : "110";
    root.dataset.appearanceTheme = theme;
    root.dataset.appearanceFont = "public_sans";
    root.dataset.appearanceDensity = settings?.appearanceDensity || "comfortable";
    root.dataset.appearanceAccent = settings?.appearanceAccent || "maroon";
    root.dataset.appearanceCorners = settings?.appearanceCorners || "sharp";
    root.dataset.appearanceReducedMotion = settings?.appearanceReducedMotion ? "true" : "false";
    root.classList.toggle("dark", theme === "dark");
    root.style.fontSize = `${Number(fontScale) / 100}em`;
    const accents: Record<string, string> = { maroon: "oklch(0.37 0.13 27)", teal: "oklch(0.45 0.11 180)", blue: "oklch(0.42 0.13 255)", forest: "oklch(0.39 0.12 145)" };
    root.style.setProperty("--primary", accents[settings?.appearanceAccent || "maroon"] || accents.maroon);
    root.style.setProperty("--ring", accents[settings?.appearanceAccent || "maroon"] || accents.maroon);
    root.style.setProperty("--radius", settings?.appearanceCorners === "round" ? "0.75rem" : settings?.appearanceCorners === "soft" ? "0.5rem" : "0.2rem");
  }, [settings]);
  return null;
}
