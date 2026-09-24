import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function GlobalAppearanceControls() {
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = setup.data?.settings;

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("procurewise.appearanceTheme");
      if (stored === "dark" || stored === "light") return stored;
      if (document.documentElement.dataset.appearanceTheme === "dark") return "dark";
    }
    return "light";
  });

  const update = trpc.procurement.setup.updateSettings.useMutation({
    onSuccess: () => {
      void utils.procurement.setup.details.invalidate();
      toast.success("Theme preference updated.");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!settings) return;
    const resolvedTheme = settings.appearanceTheme === "dark" ? "dark" : "light";
    setTheme(resolvedTheme);
  }, [settings]);

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
    if (typeof window !== "undefined") {
      localStorage.setItem("procurewise.appearanceTheme", nextTheme);
    }
    const root = document.documentElement;
    root.dataset.appearanceTheme = nextTheme;
    root.classList.toggle("dark", nextTheme === "dark");

    update.mutate({
      entityName: settings?.entityName || "Batanes State College",
      authorizedOfficialName: settings?.authorizedOfficialName || undefined,
      authorizedOfficialDesignation: settings?.authorizedOfficialDesignation || undefined,
      chiefAccountantName: settings?.chiefAccountantName || undefined,
      defaultNoticeSignatory: settings?.defaultNoticeSignatory || undefined,
      sessionTimeoutMinutes: settings?.sessionTimeoutMinutes || 30,
      enableInAppNotifications: settings?.enableInAppNotifications !== 0,
      notificationRefreshSeconds: settings?.notificationRefreshSeconds || 15,
      appearanceTheme: nextTheme,
      appearanceFont: "public_sans",
      appearanceFontScale: "110", // backward compatibility value only; not user-editable
      appearanceDensity: "comfortable",
      appearanceAccent: "maroon",
      appearanceCorners: "sharp",
      appearanceReducedMotion: Boolean(settings?.appearanceReducedMotion),
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        className="h-9 w-9 rounded-[4px] text-[#566171] hover:text-[#202833] dark:text-[#aeb9c4] dark:hover:text-[#f1f5f8]"
        aria-label="System appearance settings"
        aria-expanded={open}
      >
        {theme === "dark" ? <Moon className="h-4 w-4 text-[#f0c36a]" /> : <Sun className="h-4 w-4 text-[#566171]" />}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-md border border-[#e4e1da] bg-white p-3 shadow-lg dark:border-[#46515c] dark:bg-[#1b2229]">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1f2933] dark:text-[#f1f5f8]">Appearance</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#68737f] dark:text-[#aeb9c4]">{theme} mode</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-[4px] border border-[#e4e1da] bg-[#f7f8fa] p-1 dark:border-[#46515c] dark:bg-[#232c35]">
            <button
              type="button"
              onClick={() => applyTheme("light")}
              className={`flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 text-xs font-medium transition-colors ${
                theme === "light"
                  ? "bg-white font-semibold text-[#1f2933] shadow-xs dark:bg-[#29333d] dark:text-[#f1f5f8]"
                  : "text-[#52606d] hover:text-[#1f2933] dark:text-[#aeb9c4] dark:hover:text-[#f1f5f8]"
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-[#d98b00]" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => applyTheme("dark")}
              className={`flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 text-xs font-medium transition-colors ${
                theme === "dark"
                  ? "bg-white font-semibold text-[#1f2933] shadow-xs dark:bg-[#29333d] dark:text-[#f1f5f8]"
                  : "text-[#52606d] hover:text-[#1f2933] dark:text-[#aeb9c4] dark:hover:text-[#f1f5f8]"
              }`}
            >
              <Moon className="h-3.5 w-3.5 text-[#f0c36a]" />
              <span>Dark</span>
            </button>
          </div>
          {update.isPending && <p className="mt-2 text-[10px] text-[#68737f] dark:text-[#aeb9c4]">Saving theme…</p>}
        </div>
      )}
    </div>
  );
}
