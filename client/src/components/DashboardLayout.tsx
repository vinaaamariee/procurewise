import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { NotificationToastListener } from "@/components/NotificationToastListener";
import { GlobalAppearanceControls } from "@/components/GlobalAppearanceControls";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OfficeSelect } from "@/components/OfficeSelect";
import { trpc } from "@/lib/trpc";
import { OFFICIAL_ROLE_LABELS, normalizeProcurementRole, type ProcurementRole } from "../../../shared/procurementRules";
import { Archive, Bell, BookOpenText, Boxes, Building2, ChevronLeft, ChevronRight, ClipboardList, FileCheck2, FileSearch, FileSpreadsheet, FileText, LayoutDashboard, LineChart, LoaderCircle, LogOut, Menu, PackageSearch, Paperclip, ReceiptText, Scale, Search, Send, Settings2, ShieldCheck, Star, UserCog, UsersRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const navigation: Array<{ label: string; path: string; icon: typeof LayoutDashboard; roles: ProcurementRole[] }> = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Procurement Catalog", path: "/catalog", icon: PackageSearch, roles: ["end_user", "procurement_officer", "admin"] },
  { label: "PPMP Planning", path: "/plans", icon: BookOpenText, roles: ["admin"] },
  { label: "PPMP & Purchase Requests", path: "/purchase-requests", icon: ClipboardList, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Suppliers", path: "/suppliers", icon: UsersRound, roles: ["procurement_officer", "admin"] },
  { label: "Pre-Canvass", path: "/rfq", icon: FileSearch, roles: ["end_user"] },
  { label: "Letters of Notice", path: "/officer/notices", icon: FileText, roles: ["procurement_officer", "admin"] },
  { label: "BAC Transmittals", path: "/officer/transmittals", icon: Send, roles: ["procurement_officer", "admin"] },
  { label: "Abstracts, PO & PMR", path: "/purchase-orders", icon: FileCheck2, roles: ["procurement_officer", "administrative_approver", "admin"] },
  { label: "Supplier Evaluation Form", path: "/supplier-evaluation-form", icon: Star, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Documents", path: "/documents", icon: Paperclip, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Budget Control", path: "/budgets", icon: WalletCards, roles: ["administrative_approver", "admin"] },
  { label: "Procurement Forecast", path: "/officer/forecast", icon: LineChart, roles: ["procurement_officer", "admin"] },
  { label: "Analytics", path: "/analytics", icon: Boxes, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Audit Trail", path: "/audit", icon: ReceiptText, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"] },
  { label: "Historical PMR", path: "/pmr-history", icon: ReceiptText, roles: ["procurement_officer", "administrative_approver", "supplier_contractor", "admin"] },
  { label: "Best Value Policy", path: "/best-value-policy", icon: Scale, roles: ["admin"] },
  { label: "System setup", path: "/setup", icon: Settings2, roles: ["admin"] },
  { label: "Forms Hub (Excel)", path: "/form-templates", icon: FileSpreadsheet, roles: ["procurement_officer", "admin"] },
  { label: "Test records", path: "/test-records", icon: Archive, roles: ["admin"] },
];

const SIDEBAR_STORAGE_KEY = "procurewise_sidebar_collapsed";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedOfficeName, setSelectedOfficeName] = useState(user?.officeName || "");

  // ── Hydration-safe collapse state (avoids SSR mismatch) ──
  const [isCollapsed, setIsCollapsed] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) setIsCollapsed(saved === "true");
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const utils = trpc.useUtils();
  const updateMyOfficeMutation = trpc.auth.updateMyOffice.useMutation({
    onSuccess: () => {
      toast.success("Profile office assignment updated.");
      setEditProfileOpen(false);
      void utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const procurementRole = user ? normalizeProcurementRole(user.role) : "end_user";
  const roleLabel = user ? OFFICIAL_ROLE_LABELS[user.role as ProcurementRole] ?? OFFICIAL_ROLE_LABELS[procurementRole] : OFFICIAL_ROLE_LABELS.end_user;
  const visibleNavigation = navigation.filter((item) => item.roles.includes(procurementRole));
  const notifications = trpc.procurement.notifications.list.useQuery(undefined, { retry: false, enabled: Boolean(user), refetchInterval: 15_000, refetchIntervalInBackground: true });
  const unreadCount = notifications.data?.filter((notification) => !notification.readAt).length ?? 0;
  const handleLogout = async () => { await logout(); setLocation("/access"); };

  if (loading) {
    return <div className="min-h-screen bg-[#f8f7f3] dark:bg-[#11161b]" />;
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f7f3] px-5 dark:bg-[#11161b]">
        <div className="w-full max-w-md border border-border bg-card p-8 text-center shadow-[0_12px_36px_rgba(36,42,52,0.08)] dark:border-[#46515c]">
          <ProcureWiseLogo className="justify-center" />
          <ShieldCheck className="mx-auto mt-8 h-8 w-8 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">Authorized access only</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to access your assigned procurement workspace and workflow actions.</p>
          <Button asChild className="mt-7 h-10 w-full rounded-[4px] bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Link href="/access">Sign in to ProcureWise</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground print:min-h-0 print:bg-white print:p-0 print:m-0">
      <NotificationToastListener />

      {/* ── Top Navigation Bar ── */}
      <div className="w-full border-b border-border bg-card print:hidden no-print">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} className="h-9 w-9 rounded-[4px] lg:hidden text-muted-foreground" aria-label="Toggle navigation">
            <Menu className="h-4.5 w-4.5" />
          </Button>

          <Link href="/dashboard" className="shrink-0"><ProcureWiseLogo /></Link>

          {/* Global search — desktop only */}
          <div className="mx-auto hidden max-w-md flex-1 lg:block">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search procurement records" placeholder="Search PR, RFQ, PO, or supplier" className="h-9 rounded-[4px] border-border bg-muted/30 pl-9 text-xs shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-primary" />
            </label>
          </div>

          {/* Right-side controls */}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/notifications")} className="relative h-9 w-9 rounded-[4px] text-muted-foreground hover:text-foreground" aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-card bg-primary px-1 text-[8px] font-bold leading-none text-primary-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </Button>

            <GlobalAppearanceControls />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex h-9 items-center gap-2 rounded-[4px] px-2 hover:bg-accent" aria-label="Open account menu">
                  <Avatar className="h-8 w-8 rounded-[4px] border border-border">
                    <AvatarFallback className="rounded-[3px] bg-[#f8f1e0] text-[11px] font-bold text-primary dark:bg-[#3d2719] dark:text-[#f0c36a]">{user.name?.slice(0, 1).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[132px] text-left xl:block">
                    <span className="block truncate text-xs font-semibold text-foreground">{user.name || "Procurement User"}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-[#8a6a2e] dark:text-[#f0c36a]">{roleLabel}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-border bg-card">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-semibold text-foreground">{user.name || "Procurement User"}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{user.email || "Signed-in account"}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#8a6a2e] dark:text-[#f0c36a]">{roleLabel}</p>
                  {user.officeName && <p className="mt-1 truncate text-[11px] text-muted-foreground">{user.officeName}</p>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onSelect={() => setEditProfileOpen(true)} className="cursor-pointer">
                  <UserCog className="h-4 w-4 mr-2 text-primary" />
                  <span>Edit Profile / Department</span>
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => void handleLogout()} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Profile Dialog */}
            <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
              <DialogContent className="max-w-md border border-border bg-card">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <UserCog className="h-4 w-4 text-primary" />
                    <span>My Profile & Office Assignment</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Assign your active institutional office or department. This office will be prefilled on your Purchase Requests and procurement forms.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-foreground">Full Name</label>
                    <p className="mt-1 font-medium text-foreground">{user.name || "Procurement User"}</p>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Account Email</label>
                    <p className="mt-1 text-muted-foreground">{user.email || "—"}</p>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground">Workflow Role</label>
                    <p className="mt-1 font-semibold text-[#8a6a2e] dark:text-[#f0c36a]">{roleLabel}</p>
                  </div>
                  <div>
                    <label htmlFor="user-office-select" className="font-semibold text-foreground">Assigned Office / Unit</label>
                    <div className="mt-1.5">
                      <OfficeSelect
                        id="user-office-select"
                        value={selectedOfficeName}
                        valueMode="name"
                        onChange={setSelectedOfficeName}
                        placeholder="Search & select your institutional office..."
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditProfileOpen(false)} className="text-xs">Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={updateMyOfficeMutation.isPending}
                    onClick={() => { updateMyOfficeMutation.mutate({ officeName: selectedOfficeName }); }}
                    className="bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    {updateMyOfficeMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Save Office Assignment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* ── Body: Sidebar + Main ── */}
      <div className="mx-auto flex w-full max-w-[1600px] min-w-0 overflow-x-hidden print:block print:w-full print:max-w-none print:m-0 print:p-0">

        {/* ── MOBILE DRAWER (< 1024px) — completely unchanged ── */}
        <aside className={`fixed inset-x-0 top-16 z-20 border-b border-border bg-card p-3 lg:hidden print:hidden no-print ${menuOpen ? "block" : "hidden"}`}>
          <p className="mb-2.5 px-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Procurement workspace</p>
          <nav className="grid gap-0.5">
            {visibleNavigation.map((item) => {
              const active = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { setLocation(item.path); setMenuOpen(false); }}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-9.5 items-center gap-2.5 rounded-[4px] px-2.5 text-left text-[13px] transition-colors ${
                    active
                      ? "bg-primary pl-3 font-bold text-primary-foreground shadow-[0_2px_7px_rgba(92,20,20,0.18)]"
                      : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#f7d98b] dark:text-[#ffd166]" : "text-muted-foreground"}`} />
                  <span>{procurementRole === "end_user" && item.path === "/analytics" ? "My Analytics" : procurementRole === "end_user" && item.path === "/audit" ? "My Audit Trail" : item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── DESKTOP SIDEBAR (≥ 1024px) ── */}
        <aside
          className={`sidebar-rail hidden lg:flex flex-col min-h-[calc(100vh-64px)] shrink-0 border-r border-border bg-card print:hidden no-print ${
            isCollapsed ? "w-16" : "w-[252px]"
          }`}
        >
          {/* Navigation Items */}
          <div className={`flex-1 p-2 pt-4`}>
            {!isCollapsed && (
              <p className="mb-2.5 px-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Procurement workspace</p>
            )}
            <nav className="grid gap-0.5">
              {visibleNavigation.map((item) => {
                const active = location === item.path;
                const label = procurementRole === "end_user" && item.path === "/analytics"
                  ? "My Analytics"
                  : procurementRole === "end_user" && item.path === "/audit"
                  ? "My Audit Trail"
                  : item.label;

                const btn = (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-9.5 w-full items-center rounded-[4px] text-left text-[13px] transition-colors ${
                      isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
                    } ${
                      active
                        ? "bg-primary font-bold text-primary-foreground shadow-[0_2px_7px_rgba(92,20,20,0.15)]"
                        : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#f7d98b] dark:text-[#ffd166]" : "text-muted-foreground"}`} />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </button>
                );

                return isCollapsed ? (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-medium">{label}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div key={item.path}>{btn}</div>
                );
              })}
            </nav>
          </div>

          {/* Role-Gated badge — hidden when collapsed */}
          {!isCollapsed && (
            <div className="mx-3 mb-4 rounded-[4px] border border-[#e7dfce] bg-[#fcfaf4] p-3.5 dark:border-[#635028] dark:bg-[#221c12]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9a6d19] dark:text-[#f0c36a]">Workflow controls</p>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Actions appear only when your assigned role is permitted to act.</p>
              <Badge variant="outline" className="mt-2 rounded-[3px] border-[#dec99b] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#7b5c20] dark:border-[#806429] dark:bg-[#2b2416] dark:text-[#f0c36a]">ROLE-GATED</Badge>
            </div>
          )}

          {/* Collapse Toggle Button */}
          <div className={`border-t border-border p-2 ${isCollapsed ? "flex justify-center" : "flex justify-end"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="h-8 w-8 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="min-w-0 flex-1 w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-7 print:p-0 print:m-0 print:w-full print:max-w-none print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
