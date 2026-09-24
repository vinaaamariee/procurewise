import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Moon, Settings2, Sun, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function GlobalAppearanceControls() {
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const settings = setup.data?.settings;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fontScale, setFontScale] = useState<"110" | "120">("110");
  const update = trpc.procurement.setup.updateSettings.useMutation({
    onSuccess: () => {
      void utils.procurement.setup.details.invalidate();
      toast.success("Appearance updated for the entire system.");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!settings) return;
    setTheme(settings.appearanceTheme === "dark" ? "dark" : "light");
    setFontScale(settings.appearanceFontScale === "120" ? "120" : "110");
  }, [settings]);

  const save = (next: { theme?: "light" | "dark"; fontScale?: "110" | "120" }) => {
    const nextTheme = next.theme ?? theme;
    const nextScale = next.fontScale ?? fontScale;
    setTheme(nextTheme);
    setFontScale(nextScale);
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
      appearanceFontScale: nextScale,
      appearanceDensity: "comfortable",
      appearanceAccent: "maroon",
      appearanceCorners: "sharp",
      appearanceReducedMotion: Boolean(settings?.appearanceReducedMotion),
    });
  };

  return <div className="relative">
    <Button type="button" variant="ghost" size="icon" onClick={() => setOpen((current) => !current)} className="h-9 w-9 rounded-[4px]" aria-label="System appearance settings" aria-expanded={open}>
      <Settings2 className="h-4 w-4 text-[#566171]" />
    </Button>
    {open && <div className="absolute right-0 top-11 z-50 w-72 rounded-md border border-[#e4e1da] bg-white p-4 shadow-lg dark:border-white/15 dark:bg-[#252a32]">
      <div className="mb-4 flex items-start gap-2"><Settings2 className="mt-0.5 h-4 w-4 text-[#7b1e1e] dark:text-[#f0a38c]" /><div><p className="text-sm font-semibold text-[#202833] dark:text-[#f1f3f5]">System appearance</p><p className="mt-1 text-[11px] leading-4 text-[#77818d] dark:text-[#bac2cc]">These preferences apply across the entire ProcureWise system.</p></div></div>
      <div className="grid gap-3">
        <div><p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#566171] dark:text-[#d4d9df]"><Sun className="h-3.5 w-3.5" />Theme</p><Select value={theme} onValueChange={(value) => save({ theme: value as "light" | "dark" })}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">Light theme</SelectItem><SelectItem value="dark">Dark theme</SelectItem></SelectContent></Select></div>
        <div><p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#566171] dark:text-[#d4d9df]"><Type className="h-3.5 w-3.5" />Font and text size</p><div className="rounded border border-[#e4e1da] bg-[#fbfaf7] px-3 py-2 text-xs text-[#3f4a57] dark:border-white/15 dark:bg-white/5 dark:text-[#f1f3f5]">Public Sans · larger text</div><Select value={fontScale} onValueChange={(value) => save({ fontScale: value as "110" | "120" })}><SelectTrigger className="mt-2 h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="110">Large — 110%</SelectItem><SelectItem value="120">Extra large — 120%</SelectItem></SelectContent></Select></div>
      </div>
      {update.isPending && <p className="mt-3 text-[10px] text-[#77818d]">Saving system appearance…</p>}
    </div>}
  </div>;
}
