import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

export function GlobalAppearanceControls({ className }: { className?: string }) {
  const { user } = useAuth();
  const isAdmin = user && normalizeProcurementRole(user.role) === "admin";
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false, enabled: Boolean(isAdmin) });
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = setup.data?.settings;

  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = theme || resolvedTheme || "light";

  const update = trpc.procurement.setup.updateSettings.useMutation({
    onSuccess: () => {
      void utils.procurement.setup.details.invalidate();
    },
    onError: (error) => {
      console.warn("Theme sync to server:", error.message);
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const applyTheme = (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);

    if (isAdmin && settings) {
      update.mutate({
        entityName: settings.entityName || "Batanes State College",
        authorizedOfficialName: settings.authorizedOfficialName || undefined,
        authorizedOfficialDesignation: settings.authorizedOfficialDesignation || undefined,
        chiefAccountantName: settings.chiefAccountantName || undefined,
        defaultNoticeSignatory: settings.defaultNoticeSignatory || undefined,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes || 30,
        enableInAppNotifications: settings.enableInAppNotifications !== 0,
        notificationRefreshSeconds: settings.notificationRefreshSeconds || 15,
        appearanceTheme: nextTheme,
        appearanceFont: "public_sans",
        appearanceFontScale: "110", // backward compatibility value only; not user-editable
        appearanceDensity: "comfortable",
        appearanceAccent: "maroon",
        appearanceCorners: "sharp",
        appearanceReducedMotion: Boolean(settings.appearanceReducedMotion),
      });
    }
  };

  return (
    <div className={`relative ${className || ""}`} ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        className="h-9 w-9 rounded-[4px] text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-muted/50"
        aria-label="System appearance settings"
        aria-expanded={open}
      >
        {currentTheme === "dark" ? <Moon className="h-4 w-4 text-[#f0c36a]" /> : <Sun className="h-4 w-4 text-[#566171] dark:text-[#aeb9c4]" />}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-md border border-border dark:border-border bg-card p-3 shadow-lg outline-none focus:outline-none ring-0">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Appearance</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{currentTheme} mode</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-[4px] border border-border dark:border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => applyTheme("light")}
              className={`flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 text-xs font-medium focus:outline-none ${
                currentTheme === "light"
                  ? "bg-card font-semibold text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-[#d98b00]" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => applyTheme("dark")}
              className={`flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 text-xs font-medium focus:outline-none ${
                currentTheme === "dark"
                  ? "bg-card font-semibold text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-3.5 w-3.5 text-[#f0c36a]" />
              <span>Dark</span>
            </button>
          </div>
          {update.isPending && <p className="mt-2 text-[10px] text-muted-foreground">Saving theme…</p>}
        </div>
      )}
    </div>
  );
}
