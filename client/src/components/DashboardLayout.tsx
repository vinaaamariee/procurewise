import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationToastListener } from "@/components/NotificationToastListener";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OfficeSelect } from "@/components/OfficeSelect";
import { trpc } from "@/lib/trpc";
import { OFFICIAL_ROLE_LABELS, normalizeProcurementRole, type ProcurementRole } from "../../../shared/procurementRules";
import {
  Archive, Bell, BookOpenText, Boxes, ChevronLeft, ChevronRight,
  ClipboardList, FileCheck2, FileSearch, FileSpreadsheet, FileText,
  LayoutDashboard, LifeBuoy, LineChart, LoaderCircle, LogOut, Menu,
  Moon, PackageSearch, Paperclip, ReceiptText, Scale, Search,
  Send, Settings2, ShieldCheck, Star, Sun, UserCog, UsersRound,
  WalletCards, Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// ─── Navigation registry (role-gated) ─────────────────────────────────────────
const navigation: Array<{
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: ProcurementRole[];
  category?: string;
}> = [
  { label: "Overview",                   path: "/dashboard",             icon: LayoutDashboard, roles: ["end_user", "procurement_officer", "administrative_approver", "admin"], category: "workspace" },
  { label: "Procurement Catalog",        path: "/catalog",               icon: PackageSearch,   roles: ["end_user", "procurement_officer", "admin"],                           category: "workspace" },
  { label: "PPMP Planning",              path: "/plans",                 icon: BookOpenText,    roles: ["admin"],                                                              category: "workspace" },
  { label: "PPMP & Purchase Requests",   path: "/purchase-requests",     icon: ClipboardList,   roles: ["end_user", "procurement_officer", "administrative_approver", "admin"], category: "workspace" },
  { label: "Pre-Canvass",               path: "/rfq",                   icon: FileSearch,      roles: ["end_user"],                                                           category: "workspace" },
  { label: "Suppliers",                  path: "/suppliers",             icon: UsersRound,      roles: ["procurement_officer", "admin"],                                       category: "workspace" },
  { label: "Letters of Notice",          path: "/officer/notices",       icon: FileText,        roles: ["procurement_officer", "admin"],                                       category: "processing" },
  { label: "BAC Transmittals",           path: "/officer/transmittals",  icon: Send,            roles: ["procurement_officer", "admin"],                                       category: "processing" },
  { label: "Abstracts, PO & PMR",        path: "/purchase-orders",       icon: FileCheck2,      roles: ["procurement_officer", "administrative_approver", "admin"],            category: "processing" },
  { label: "Supplier Evaluation",        path: "/supplier-evaluation-form", icon: Star,         roles: ["end_user", "procurement_officer", "administrative_approver", "admin"], category: "processing" },
  { label: "Documents",                  path: "/documents",             icon: Paperclip,       roles: ["end_user", "procurement_officer", "administrative_approver", "admin"], category: "processing" },
  { label: "Budget Control",             path: "/budgets",               icon: WalletCards,     roles: ["administrative_approver", "admin"],                                   category: "processing" },
  { label: "Procurement Forecast",       path: "/officer/forecast",      icon: LineChart,       roles: ["procurement_officer", "admin"],                                       category: "reports" },
  { label: "Analytics",                  path: "/analytics",             icon: Boxes,           roles: ["end_user", "procurement_officer", "administrative_approver", "admin"], category: "reports" },
  { label: "Audit Trail",               path: "/audit",                 icon: ReceiptText,     roles: ["end_user", "procurement_officer", "administrative_approver", "admin"], category: "reports" },
  { label: "Historical PMR",             path: "/pmr-history",           icon: ReceiptText,     roles: ["procurement_officer", "administrative_approver", "supplier_contractor", "admin"], category: "reports" },
  { label: "Best Value Policy",          path: "/best-value-policy",     icon: Scale,           roles: ["admin"],                                                              category: "admin" },
  { label: "Forms Hub",                  path: "/form-templates",        icon: FileSpreadsheet, roles: ["procurement_officer", "admin"],                                       category: "admin" },
  { label: "System Setup",              path: "/setup",                 icon: Settings2,       roles: ["admin"],                                                              category: "admin" },
  { label: "Test Records",              path: "/test-records",          icon: Archive,         roles: ["admin"],                                                              category: "admin" },
];

const CATEGORY_LABELS: Record<string, string> = {
  workspace:  "Workspace",
  processing: "Processing",
  reports:    "Reports",
  admin:      "Administration",
};

const SIDEBAR_STORAGE_KEY = "procurewise_sidebar_collapsed";

// ─── Inline theme toggle ───────────────────────────────────────────────────────
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 transition-colors hover:bg-[#3034ff]/20 hover:text-[#a5a6ff]"
    >
      {isDark
        ? <Sun  className="h-4 w-4" />
        : <Moon className="h-4 w-4" />}
    </button>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedOfficeName, setSelectedOfficeName] = useState(user?.officeName || "");
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Hydration-safe collapse state
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
  const roleLabel = user
    ? OFFICIAL_ROLE_LABELS[user.role as ProcurementRole] ?? OFFICIAL_ROLE_LABELS[procurementRole]
    : OFFICIAL_ROLE_LABELS.end_user;

  const allVisible = navigation.filter((item) => item.roles.includes(procurementRole));

  // Apply end-user label overrides + filter by search
  const getLabel = (item: (typeof navigation)[0]) =>
    procurementRole === "end_user" && item.path === "/analytics" ? "My Analytics"
    : procurementRole === "end_user" && item.path === "/audit" ? "My Audit Trail"
    : item.label;

  const visibleNavigation = allVisible.filter((item) => {
    if (!searchQuery.trim()) return true;
    return getLabel(item).toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group by category for section headers
  const grouped = visibleNavigation.reduce<Record<string, typeof visibleNavigation>>((acc, item) => {
    const cat = item.category ?? "workspace";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const notifications = trpc.procurement.notifications.list.useQuery(undefined, {
    retry: false, enabled: Boolean(user), refetchInterval: 15_000, refetchIntervalInBackground: true,
  });
  const unreadCount = notifications.data?.filter((n) => !n.readAt).length ?? 0;
  const handleLogout = async () => { await logout(); setLocation("/access"); };

  const userInitials = (user?.name || "U").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return <div className="min-h-screen bg-[#0c1322]" />;

  // ── Unauthenticated guard ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0c1322] px-5">
        <div className="w-full max-w-md rounded-2xl border border-[#1e2a3e] bg-[#111827] p-8 text-center shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
          {/* Logo badge */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#3034ff] shadow-lg shadow-[#3034ff]/25">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <ShieldCheck className="mx-auto mt-6 h-8 w-8 text-[#a5a6ff]" />
          <h1 className="mt-4 font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">Authorized access only</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Sign in to access your assigned procurement workspace and workflow actions.</p>
          <Link
            href="/access"
            className="mt-7 flex h-11 w-full items-center justify-center rounded-xl bg-[#3034ff] text-sm font-semibold text-white shadow-lg shadow-[#3034ff]/25 transition hover:bg-[#5256ff]"
          >
            Sign in to ProcureWise
          </Link>
        </div>
      </div>
    );
  }

  // ── Sidebar nav item ───────────────────────────────────────────────────────
  const NavItem = ({ item }: { item: (typeof navigation)[0] }) => {
    const label = getLabel(item);
    const active = location === item.path;

    const btn = (
      <button
        key={item.path}
        type="button"
        onClick={() => { setLocation(item.path); setMenuOpen(false); }}
        aria-current={active ? "page" : undefined}
        style={active ? { boxShadow: "0 0 15px rgba(48,52,255,0.3)" } : undefined}
        className={[
          "group relative flex w-full items-center gap-0 rounded-xl py-2 text-left text-[13px] font-medium transition-all duration-150",
          isCollapsed ? "justify-center px-2" : "px-3",
          active
            ? "border border-[#3034ff]/30 bg-[rgba(48,52,255,0.2)] text-white"
            : "border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
        ].join(" ")}
      >
        {/* Active top accent hairline */}
        {active && (
          <span
            className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, #5256ff, transparent)" }}
          />
        )}

        {/* Icon container */}
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            isCollapsed ? "" : "mr-3",
            active
              ? "bg-[#3034ff]/20 text-[#a5a6ff]"
              : "bg-slate-800/80 text-slate-400 group-hover:bg-slate-700/80 group-hover:text-slate-200",
          ].join(" ")}
        >
          <item.icon className="h-[15px] w-[15px]" />
        </span>

        {!isCollapsed && <span className="truncate leading-none">{label}</span>}
      </button>
    );

    return isCollapsed ? (
      <Tooltip key={item.path}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="rounded-lg border-[#1e2a3e] bg-[#111827] text-xs font-medium text-slate-200">
          {label}
        </TooltipContent>
      </Tooltip>
    ) : (
      <div key={item.path}>{btn}</div>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground print:bg-white">
      <NotificationToastListener />

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-[#1e2a3e] px-4 lg:hidden print:hidden"
        style={{ background: "linear-gradient(180deg,#111827 0%,#0c1322 100%)" }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-200"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3034ff] shadow-md shadow-[#3034ff]/25">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-white">ProcureWise</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation("/notifications")}
            aria-label="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-slate-400"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3034ff] px-0.5 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* ── Mobile drawer overlay ─────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#1e2a3e] pt-14 transition-transform duration-300 lg:hidden print:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ width: 260, background: "linear-gradient(180deg,#111827 0%,#0c1322 100%)" }}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-700/50 bg-slate-800/50 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3034ff]"
            />
          </div>
          <MobileNavContent
            grouped={grouped}
            getLabel={getLabel}
            location={location}
            setLocation={setLocation}
            setMenuOpen={setMenuOpen}
          />
        </div>
        <MobileProfileFooter
          user={user}
          userInitials={userInitials}
          roleLabel={roleLabel}
          onEditProfile={() => { setEditProfileOpen(true); setMenuOpen(false); }}
          onLogout={() => void handleLogout()}
        />
      </aside>

      {/* ── Full layout: sidebar + main ──────────────────────────────────── */}
      <div className="flex min-h-screen">

        {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────── */}
        <aside
          className={[
            "sidebar-rail hidden lg:flex flex-col min-h-screen shrink-0 border-r border-[#1e2a3e] print:hidden",
            isCollapsed ? "w-[72px]" : "w-[268px]",
          ].join(" ")}
          style={{ background: "linear-gradient(180deg,#111827 0%,#0c1322 100%)" }}
        >
          {/* ── Header ── */}
          <div className={`flex h-16 shrink-0 items-center border-b border-[#1e2a3e] ${isCollapsed ? "justify-center px-3" : "justify-between px-4"}`}>
            {isCollapsed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3034ff] shadow-lg shadow-[#3034ff]/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3034ff] shadow-lg shadow-[#3034ff]/25">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-white leading-tight">ProcureWise</p>
                    <p className="text-[10px] font-medium text-[#a5a6ff] leading-tight">Gov. Procurement</p>
                  </div>
                </div>
                <ThemeToggle />
              </>
            )}
          </div>

          {/* ── Search (expanded only) ── */}
          {!isCollapsed && (
            <div className="px-3 pt-4 pb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search menu…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-700/50 bg-slate-800/50 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3034ff]"
                />
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-3">
                {!isCollapsed && (
                  <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                )}
                <nav className="grid gap-0.5">
                  {items.map((item) => <NavItem key={item.path} item={item} />)}
                </nav>
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 border-t border-[#1e2a3e] p-2">
            {/* Help & Support row */}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setLocation("/notifications")}
                className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400">
                  <LifeBuoy className="h-[15px] w-[15px]" />
                </span>
                <span>Help &amp; Support</span>
                {unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3034ff] px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setLocation("/notifications")}
                    className="mb-2 flex w-full items-center justify-center rounded-xl py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80">
                      <LifeBuoy className="h-[15px] w-[15px]" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="rounded-lg border-[#1e2a3e] bg-[#111827] text-xs text-slate-200">Help &amp; Support</TooltipContent>
              </Tooltip>
            )}

            {/* Collapse toggle */}
            <div className={`mb-2 flex ${isCollapsed ? "justify-center" : "justify-end"}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/60 text-slate-500 transition hover:bg-slate-700/60 hover:text-slate-300"
                  >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="rounded-lg border-[#1e2a3e] bg-[#111827] text-xs text-slate-200">
                  {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Pinned profile card */}
            <div
              className="rounded-xl border border-[#1e2a3e] p-3"
              style={{ background: "linear-gradient(145deg,#151d2e 0%,#0e1420 100%)" }}
            >
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setEditProfileOpen(true)}
                      className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#3034ff]/20"
                    >
                      <span className="text-xs font-bold text-[#a5a6ff]">{userInitials}</span>
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111827] bg-emerald-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="rounded-lg border-[#1e2a3e] bg-[#111827] text-xs text-slate-200">
                    {user.name || "Procurement User"}<br />
                    <span className="text-[#a5a6ff]">{roleLabel}</span>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2.5">
                  {/* Avatar */}
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(true)}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3034ff]/20 ring-2 ring-[#3034ff]/30 transition hover:ring-[#3034ff]/60"
                    title="Edit profile"
                  >
                    <span className="text-xs font-bold text-[#a5a6ff]">{userInitials}</span>
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#151d2e] bg-emerald-400" />
                  </button>

                  {/* Name + role */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-tight text-slate-100">
                      {user.name || "Procurement User"}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-[#a5a6ff]">{roleLabel}</p>
                  </div>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    aria-label="Sign out"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
                    title="Sign out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 overflow-x-hidden pt-14 lg:pt-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-7 print:p-0">
          {children}
        </main>
      </div>

      {/* ── Edit Profile Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-md border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UserCog className="h-4 w-4 text-primary" />
              <span>My Profile &amp; Office Assignment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign your active institutional office or department. This office will be prefilled on Purchase Requests and procurement forms.
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
              <p className="mt-1 font-semibold text-[#a5a6ff]">{roleLabel}</p>
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
              onClick={() => updateMyOfficeMutation.mutate({ officeName: selectedOfficeName })}
              className="bg-primary text-xs text-primary-foreground hover:bg-primary/90"
            >
              {updateMyOfficeMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Office Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Mobile-only nav content ─────────────────────────────────────────────────
function MobileNavContent({
  grouped, getLabel, location, setLocation, setMenuOpen,
}: {
  grouped: Record<string, typeof navigation>;
  getLabel: (item: (typeof navigation)[0]) => string;
  location: string;
  setLocation: (path: string) => void;
  setMenuOpen: (open: boolean) => void;
}) {
  return (
    <>
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="mb-4">
          <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {CATEGORY_LABELS[cat] ?? cat}
          </p>
          <nav className="grid gap-0.5">
            {items.map((item) => {
              const label = getLabel(item);
              const active = location === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => { setLocation(item.path); setMenuOpen(false); }}
                  aria-current={active ? "page" : undefined}
                  style={active ? { boxShadow: "0 0 15px rgba(48,52,255,0.3)" } : undefined}
                  className={[
                    "group relative flex w-full items-center gap-0 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-all",
                    active
                      ? "border border-[#3034ff]/30 bg-[rgba(48,52,255,0.2)] text-white"
                      : "border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                  ].join(" ")}
                >
                  {active && (
                    <span
                      className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full"
                      style={{ background: "linear-gradient(90deg,transparent,#5256ff,transparent)" }}
                    />
                  )}
                  <span className={[
                    "mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active ? "bg-[#3034ff]/20 text-[#a5a6ff]" : "bg-slate-800/80 text-slate-400 group-hover:bg-slate-700/80 group-hover:text-slate-200",
                  ].join(" ")}>
                    <item.icon className="h-[15px] w-[15px]" />
                  </span>
                  <span className="truncate leading-none">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );
}

// ─── Mobile profile footer ────────────────────────────────────────────────────
function MobileProfileFooter({
  user, userInitials, roleLabel, onEditProfile, onLogout,
}: {
  user: { name?: string | null; email?: string | null };
  userInitials: string;
  roleLabel: string;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-[#1e2a3e] p-3">
      <div
        className="flex items-center gap-2.5 rounded-xl border border-[#1e2a3e] p-3"
        style={{ background: "linear-gradient(145deg,#151d2e 0%,#0e1420 100%)" }}
      >
        <button
          type="button"
          onClick={onEditProfile}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3034ff]/20 ring-2 ring-[#3034ff]/30"
        >
          <span className="text-xs font-bold text-[#a5a6ff]">{userInitials}</span>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#151d2e] bg-emerald-400" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-100">{user.name || "Procurement User"}</p>
          <p className="truncate text-[10px] text-[#a5a6ff]">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
