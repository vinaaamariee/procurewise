import { useTheme as useNextTheme, ThemeProvider as NextThemeProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider(props: ThemeProviderProps) {
  return <NextThemeProvider {...props} />;
}

export function useTheme() {
  const nextTheme = useNextTheme();
  return {
    ...nextTheme,
    toggleTheme: () => {
      const current = nextTheme.resolvedTheme || nextTheme.theme;
      nextTheme.setTheme(current === "dark" ? "light" : "dark");
    },
  };
}
