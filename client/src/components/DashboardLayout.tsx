import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationToastListener } from "@/components/NotificationToastListener";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OfficeSelect } from "@/components/OfficeSelect";
import { trpc } from "@/lib/trpc";
import { OFFICIAL_ROLE_LABELS, normalizeProcurementRole, type ProcurementRole, type PersistedUserRole } from "../../../shared/procurementRules";
import {
  Archive, Bell, BookOpenText, Boxes, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, FileCheck2, FileSearch, FileSpreadsheet, FileText,
  LayoutDashboard, LifeBuoy, LineChart, LoaderCircle, LogOut, Menu,
  Moon, PackageSearch, Paperclip, ReceiptText, Scale, Search,
  Send, Settings2, ShieldCheck, Star, Sun, UserCog, UsersRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// ─── Navigation registry (strict role-gated per Section 5) ────────────────────
const navigation: Array<{
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles: ProcurementRole[];
  category?: string;
}> = [
  // ── Workspace ──
  {
    label: "Overview",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "administrative_approver",
      "admin",
    ],
    category: "workspace",
  },
  {
    label: "Procurement Catalog",
    path: "/catalog",
    icon: PackageSearch,
    // Strictly End-User only; removed from Procurement Officer, Staff, BAC, HoPE, Budget Officer
    roles: ["end_user", "admin"],
    category: "workspace",
  },
  {
    label: "PPMP Planning",
    path: "/plans",
    icon: BookOpenText,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "workspace",
  },
  {
    label: "PPMP & Purchase Requests",
    path: "/purchase-requests",
    icon: ClipboardList,
    // Visible to End-User, PO, Staff, HoPE, and Admin (hidden from BAC and Budget Officer)
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "hope",
      "admin",
    ],
    category: "workspace",
  },
  {
    label: "Suppliers",
    path: "/suppliers",
    icon: UsersRound,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"],
    category: "workspace",
  },
  {
    label: "Pre-Canvass",
    path: "/rfq",
    icon: FileSearch,
    // Exclusively visible to End-Users; strictly hidden from all other roles
    roles: ["end_user"],
    category: "workspace",
  },

  // ── Processing ──
  {
    label: "Letters of Notice",
    path: "/officer/notices",
    icon: FileText,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"],
    category: "processing",
  },
  {
    label: "BAC Transmittals",
    path: "/officer/transmittals",
    icon: Send,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "bac", "bac_secretariat", "admin"],
    category: "processing",
  },
  {
    label: "Abstracts, PO & PMR",
    path: "/purchase-orders",
    icon: FileCheck2,
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "administrative_approver",
      "admin",
    ],
    category: "processing",
  },
  {
    label: "Supplier Evaluation Form",
    path: "/supplier-evaluation-form",
    icon: Star,
    roles: ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"],
    category: "processing",
  },
  {
    label: "Documents",
    path: "/documents",
    icon: Paperclip,
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "administrative_approver",
      "admin",
    ],
    category: "processing",
  },
  {
    label: "Budget Control",
    path: "/budgets",
    icon: WalletCards,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "budget_officer", "administrative_approver", "admin"],
    category: "processing",
  },

  // ── Reports ──
  {
    label: "Procurement Forecast",
    path: "/officer/forecast",
    icon: LineChart,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "reports",
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: Boxes,
    roles: ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "reports",
  },
  {
    label: "Audit Trail",
    path: "/audit",
    icon: ReceiptText,
    roles: ["end_user", "procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "reports",
  },
  {
    label: "Historical PMR",
    path: "/pmr-history",
    icon: ReceiptText,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "supplier_contractor", "admin"],
    category: "reports",
  },

  // ── Administration ──
  {
    label: "Best Value Policy",
    path: "/best-value-policy",
    icon: Scale,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "admin",
  },
  {
    label: "Forms Hub (Excel)",
    path: "/form-templates",
    icon: FileSpreadsheet,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "procurement_staff", "admin"],
    category: "admin",
  },
  {
    label: "System setup",
    path: "/setup",
    icon: Settings2,
    roles: ["procurement_officer", "procurement_officer_i", "procurement_officer_ii", "admin"],
    category: "admin",
  },
  {
    label: "Test Records",
    path: "/test-records",
    icon: Archive,
    roles: ["admin"],
    category: "admin",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  workspace:  "Workspace",
  processing: "Processing",
  reports:    "Reports",
  admin:      "Administration",
};

const SIDEBAR_STORAGE_KEY = "procurewise_sidebar_collapsed";

// ─── Inline theme toggle (seamless light/dark transition) ──────────────────────
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-[#881337]/25 dark:hover:text-[#fda4af] transition-colors"
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

  // Collapsible category sections state (all expanded by default)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (cat: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Hydration-safe sidebar collapse state
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

  const rawRole = (user?.role || "end_user") as PersistedUserRole;
  const currentRole = (user?.role || "end_user") as ProcurementRole;
  const roleLabel = user
    ? (currentRole === "hope" ? "HoPE (College President)" : OFFICIAL_ROLE_LABELS[currentRole] ?? OFFICIAL_ROLE_LABELS[normalizeProcurementRole(rawRole)] ?? "End-User")
    : OFFICIAL_ROLE_LABELS.end_user;

  // Strict role filter per Section 5 specification
  const allVisible = navigation.filter((item) => {
    if (currentRole === "admin") return true;
    return item.roles.includes(currentRole);
  });

  // Apply role-specific descriptive label overrides
  const getLabel = (item: (typeof navigation)[0]) => {
    if (currentRole === "end_user") {
      if (item.path === "/analytics") return "My Analytics";
      if (item.path === "/audit") return "My Audit Trail";
    }
    if (currentRole === "procurement_officer" || currentRole === "procurement_officer_i" || currentRole === "procurement_officer_ii") {
      if (item.path === "/purchase-requests") return "PPMP & Purchase Requests (Verification & Review)";
      if (item.path === "/form-templates") return "Forms Hub (Excel)";
    }
    if (currentRole === "procurement_staff") {
      if (item.path === "/form-templates") return "Forms Hub (Excel)";
    }
    if (currentRole === "hope") {
      if (item.path === "/dashboard") return "Overview (Executive metrics & sign-off)";
      if (item.path === "/purchase-requests") return "PPMP & Purchase Requests (Resolutions approval)";
      if (item.path === "/purchase-orders") return "Abstracts, PO & PMR (Award & contract signing)";
    }
    if (currentRole === "bac" || currentRole === "bac_secretariat") {
      if (item.path === "/officer/transmittals") return "BAC Transmittals (PR review & resolution)";
      if (item.path === "/purchase-orders") return "Abstracts, PO & PMR (Quotation evaluation)";
    }
    if (currentRole === "budget_officer") {
      if (item.path === "/budgets") return "Budget Control (Allotment & funds certification)";
      if (item.path === "/purchase-orders") return "Abstracts, PO & PMR (Funds clearance signing)";
    }
    return item.label;
  };

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
  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-[#090d16]" />;

  // ── Unauthenticated guard ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-[#090d16] px-5 transition-colors">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] p-8 text-center shadow-[0_24px_64px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          {/* Institutional BSC Logo */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[#d2b058]/50 bg-white p-1 shadow-md">
            <img src="/bsc-logo.jpg" alt="Batanes State College" className="h-full w-full rounded-xl object-contain" />
          </div>
          <ShieldCheck className="mx-auto mt-6 h-8 w-8 text-[#881337] dark:text-[#fda4af]" />
          <h1 className="mt-4 font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900 dark:text-white">Authorized access only</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Sign in to access your assigned procurement workspace and workflow actions.</p>
          <Link
            href="/access"
            className="mt-7 flex h-11 w-full items-center justify-center rounded-xl bg-[#881337] text-sm font-semibold text-white shadow-lg shadow-[#881337]/30 transition hover:bg-[#9f1239]"
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
        style={active ? { boxShadow: "0 0 14px rgba(136,19,55,0.22)" } : undefined}
        className={[
          "group relative flex w-full items-center rounded-xl py-2 text-left transition-all duration-150",
          isCollapsed ? "justify-center px-2" : "px-3 gap-2.5",
          active
            ? "border border-[#881337]/30 dark:border-[#881337]/50 bg-[#881337]/10 dark:bg-[#881337]/25 text-[#881337] dark:text-white font-semibold before:bg-[#d5ab55]"
            : "border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200",
        ].join(" ")}
      >
        {/* Active top accent hairline */}
        {active && (
          <span
            className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full before:bg-[#d5ab55]"
            style={{ background: "linear-gradient(90deg, transparent, #e11d48, transparent)" }}
          />
        )}

        {/* Icon container */}
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            isCollapsed ? "" : "mr-0",
            active
              ? "bg-[#881337]/15 dark:bg-[#881337]/35 text-[#881337] dark:text-[#fda4af]"
              : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/80 group-hover:text-slate-800 dark:group-hover:text-slate-200",
          ].join(" ")}
        >
          <item.icon className="h-4 w-4" />
        </span>

        {!isCollapsed && (
          <span className="sidebar-nav-label flex-1 min-w-0 text-left font-medium leading-snug break-words">
            {label}
          </span>
        )}
      </button>
    );

    return isCollapsed ? (
      <Tooltip key={item.path}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-xs font-medium text-slate-800 dark:text-slate-200 shadow-md">
          {label}
        </TooltipContent>
      </Tooltip>
    ) : (
      <div key={item.path}>{btn}</div>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground transition-colors duration-200 print:bg-white">
      <NotificationToastListener />

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur px-4 lg:hidden print:hidden transition-colors"
      >
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#d2b058]/40 bg-white p-0.5 shadow-sm">
          <img src="/bsc-logo.jpg" alt="BSC Logo" className="h-full w-full rounded-md object-contain" />
        </div>
        <span className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-slate-900 dark:text-white">ProcureWise</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation("/notifications")}
            aria-label="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#881337] px-0.5 text-[9px] font-bold text-white">
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
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] text-slate-800 dark:text-slate-200 pt-14 transition-transform duration-300 lg:hidden print:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ width: 296 }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-850 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#881337]"
            />
          </div>
          <MobileNavContent
            grouped={grouped}
            getLabel={getLabel}
            location={location}
            setLocation={setLocation}
            setMenuOpen={setMenuOpen}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
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
            "sidebar-rail hidden lg:flex flex-col min-h-screen shrink-0 border-r transition-colors duration-200 print:hidden overflow-x-hidden",
            "bg-white dark:bg-[#0c1322] border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200",
            isCollapsed ? "w-[72px]" : "w-[292px]",
          ].join(" ")}
        >
          {/* ── Header ── */}
          <div className={`flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-800/80 ${isCollapsed ? "justify-center px-3" : "justify-between px-4"}`}>
            {isCollapsed ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d2b058]/40 bg-white p-0.5 shadow-sm">
                <img src="/bsc-logo.jpg" alt="BSC Logo" className="h-full w-full rounded-lg object-contain" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d2b058]/40 bg-white p-0.5 shadow-sm">
                    <img src="/bsc-logo.jpg" alt="BSC Logo" className="h-full w-full rounded-lg object-contain" />
                  </div>
                  <div>
                    <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-slate-900 dark:text-white leading-tight">ProcureWise</p>
                    <p className="text-[10px] font-medium text-[#881337] dark:text-[#fda4af] leading-tight">Gov. Procurement</p>
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
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search menu…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/50 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#881337]"
                />
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
            {Object.entries(grouped).map(([cat, items]) => {
              const isSectionCollapsed = Boolean(collapsedSections[cat]);
              return (
                <div key={cat} className="mb-3">
                  {!isCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleSection(cat)}
                      aria-expanded={!isSectionCollapsed}
                      className="group mb-1.5 flex w-full items-center justify-between px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                          isSectionCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                    </button>
                  )}
                  {(!isSectionCollapsed || isCollapsed) && (
                    <nav className="grid gap-0.5 transition-all">
                      {items.map((item) => <NavItem key={item.path} item={item} />)}
                    </nav>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 p-2">
            {/* Help & Support row */}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setLocation("/notifications")}
                className="mb-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                  <LifeBuoy className="h-[15px] w-[15px]" />
                </span>
                <span className="sidebar-nav-label flex-1 text-slate-600 dark:text-slate-400 font-medium">Help &amp; Support</span>
                {unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#881337] px-1 text-[9px] font-bold text-white">
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
                    className="mb-2 flex w-full items-center justify-center rounded-xl py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80">
                      <LifeBuoy className="h-[15px] w-[15px]" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-xs text-slate-800 dark:text-slate-200">Help &amp; Support</TooltipContent>
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-xs text-slate-800 dark:text-slate-200">
                  {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Pinned profile card */}
            <div
              className={`rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#121826] transition-colors ${
                isCollapsed ? "flex h-12 w-full items-center justify-center p-1.5" : "p-3"
              }`}
            >
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setEditProfileOpen(true)}
                      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#881337]/15 dark:bg-[#881337]/25 ring-2 ring-[#881337]/30 transition hover:ring-[#881337]/60"
                      title="Edit profile"
                    >
                      <span className="text-xs font-bold text-[#881337] dark:text-[#fda4af]">{userInitials}</span>
                      <span className="absolute top-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-[#121826] bg-emerald-500" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-xs text-slate-800 dark:text-slate-200 shadow-md">
                    {user.name || "Procurement User"}<br />
                    <span className="text-[#881337] dark:text-[#fda4af] font-semibold">{roleLabel}</span>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2.5">
                  {/* Avatar */}
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(true)}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#881337]/15 dark:bg-[#881337]/25 ring-2 ring-[#881337]/30 transition hover:ring-[#881337]/60"
                    title="Edit profile"
                  >
                    <span className="text-xs font-bold text-[#881337] dark:text-[#fda4af]">{userInitials}</span>
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#121826] bg-emerald-500" />
                  </button>

                  {/* Name + role */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-tight text-slate-800 dark:text-slate-100">
                      {user.name || "Procurement User"}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-[#881337] dark:text-[#fda4af] font-medium">{roleLabel}</p>
                  </div>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    aria-label="Sign out"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-500 dark:hover:text-rose-400"
                    title="Sign out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main content (proper padding & breathing room) ────────────────── */}
        <main className="min-w-0 flex-1 overflow-x-hidden pt-20 md:pt-10 px-6 md:px-10 pb-12 print:p-0 transition-colors">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
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
              <p className="mt-1 font-semibold text-[#881337] dark:text-[#fda4af]">{roleLabel}</p>
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
              className="bg-[#881337] text-xs text-white hover:bg-[#70102b]"
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

// ─── Mobile-only nav content (with collapsible categories) ───────────────────
function MobileNavContent({
  grouped, getLabel, location, setLocation, setMenuOpen, collapsedSections, toggleSection,
}: {
  grouped: Record<string, typeof navigation>;
  getLabel: (item: (typeof navigation)[0]) => string;
  location: string;
  setLocation: (path: string) => void;
  setMenuOpen: (open: boolean) => void;
  collapsedSections: Record<string, boolean>;
  toggleSection: (cat: string) => void;
}) {
  return (
    <>
      {Object.entries(grouped).map(([cat, items]) => {
        const isSectionCollapsed = Boolean(collapsedSections[cat]);
        return (
          <div key={cat} className="mb-4">
            <button
              type="button"
              onClick={() => toggleSection(cat)}
              className="mb-1.5 flex w-full items-center justify-between px-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <span>{CATEGORY_LABELS[cat] ?? cat}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                  isSectionCollapsed ? "-rotate-90" : "rotate-0"
                }`}
              />
            </button>
            {!isSectionCollapsed && (
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
                      style={active ? { boxShadow: "0 0 14px rgba(136,19,55,0.22)" } : undefined}
                      className={[
                        "group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all",
                        active
                          ? "border border-[#881337]/30 dark:border-[#881337]/50 bg-[#881337]/10 dark:bg-[#881337]/25 text-[#881337] dark:text-white font-semibold before:bg-[#d5ab55]"
                          : "border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200",
                      ].join(" ")}
                    >
                      {active && (
                        <span
                          className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full before:bg-[#d5ab55]"
                          style={{ background: "linear-gradient(90deg, transparent, #e11d48, transparent)" }}
                        />
                      )}
                      <span className={[
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active ? "bg-[#881337]/15 dark:bg-[#881337]/35 text-[#881337] dark:text-[#fda4af]" : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/80 group-hover:text-slate-800 dark:group-hover:text-slate-200",
                      ].join(" ")}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="sidebar-nav-label flex-1 min-w-0 text-left font-medium leading-snug break-words">{label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        );
      })}
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
    <div className="shrink-0 border-t border-slate-200 dark:border-slate-800/80 p-3 bg-slate-50/80 dark:bg-[#0c1322]">
      <div
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-[#121826] transition-colors"
      >
        <button
          type="button"
          onClick={onEditProfile}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#881337]/15 dark:bg-[#881337]/25 ring-2 ring-[#881337]/30"
        >
          <span className="text-xs font-bold text-[#881337] dark:text-[#fda4af]">{userInitials}</span>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#121826] bg-emerald-500" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{user.name || "Procurement User"}</p>
          <p className="truncate text-[10px] text-[#881337] dark:text-[#fda4af] font-medium">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-500/20 hover:text-rose-500 dark:hover:text-rose-400"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
