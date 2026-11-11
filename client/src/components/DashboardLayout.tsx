import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NotificationToastListener } from "@/components/NotificationToastListener";
import { NotificationCenterDrawer } from "@/components/NotificationCenterDrawer";
import { HelpSupportDialog } from "@/components/HelpSupportDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OfficeSelect } from "@/components/OfficeSelect";
import { trpc } from "@/lib/trpc";
import {
  OFFICIAL_ROLE_LABELS,
  normalizeProcurementRole,
  type ProcurementRole,
  type PersistedUserRole,
} from "../../../shared/procurementRules";
import {
  Archive,
  BookOpen,
  BookOpenText,
  Boxes,
  CheckSquare,
  FileCheck,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Globe,
  HelpCircle,
  Home,
  Layers,
  LineChart,
  LoaderCircle,
  LogOut,
  Menu,
  Moon,
  PackageSearch,
  Paperclip,
  ReceiptText,
  Scale,
  ScrollText,
  Search,
  Send,
  SendHorizontal,
  Settings2,
  ShieldCheck,
  Star,
  Sun,
  Truck,
  UserCheck,
  UserCog,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// ─── TypeScript Navigation Config Structure ───────────────────────────────────
export type NavSectionId =
  | "workspace"
  | "procedure_steps"
  | "reference_reports"
  | "administration";

export interface NavItemConfig {
  id: string;
  path: string;
  label: string;
  stepNumber?: string;
  procedureRef?: string;
  icon: LucideIcon;
  section: NavSectionId;
  roles: ProcurementRole[];
  roleLabels?: Partial<Record<ProcurementRole, string>>;
}

export const NAV_SECTION_HEADERS: Record<NavSectionId, string> = {
  workspace: "GENERAL WORKSPACE",
  procedure_steps: "OFFICIAL PROCEDURE STEPS",
  reference_reports: "BUDGET, RECORDS & REPORTS",
  administration: "SYSTEM & FORMS",
};

export const NAV_ITEMS: NavItemConfig[] = [
  // ── Section 1: General Workspace ──
  {
    id: "dashboard",
    path: "/dashboard",
    label: "Dashboard & Current Tasks",
    icon: Home,
    section: "workspace",
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
      "supplier_contractor",
      "admin",
    ],
  },
  {
    id: "my-purchase-requests",
    path: "/purchase-requests",
    label: "My Purchase Requests",
    stepNumber: "Annex A & B",
    procedureRef: "BSC-PRO-QP-95-1 §5.1",
    icon: FileText,
    section: "workspace",
    roles: ["end_user", "admin"],
  },
  {
    id: "pre-canvass",
    path: "/rfq",
    label: "Collect Supplier Quotes",
    stepNumber: "Pre-Canvass",
    icon: FileSearch,
    section: "workspace",
    roles: ["end_user"],
  },
  {
    id: "catalog",
    path: "/catalog",
    label: "Browse Item Catalog",
    icon: PackageSearch,
    section: "workspace",
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "admin",
    ],
  },
  {
    id: "ppmp-plans",
    path: "/plans",
    label: "Department PPMP Plans",
    stepNumber: "Annex B",
    icon: BookOpenText,
    section: "workspace",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },

  // ── Section 2: Official Procedure Steps (BSC – PRO -QP- 95 – 1) ──
  {
    id: "step-1-verify-pr",
    path: "/officer/pr-verification",
    label: "Step 1: Verify PR & PPMP",
    stepNumber: "Step 5.1",
    procedureRef: "BSC-PRO-QP-95-1 §5.1",
    icon: CheckSquare,
    section: "procedure_steps",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "step-2-pmr-log",
    path: "/pmr-registry",
    label: "Step 2: PMR Log & Tracking Slip",
    stepNumber: "Step 5.2",
    procedureRef: "BSC-PRO-QP-95-1 §5.2",
    icon: BookOpen,
    section: "procedure_steps",
    roles: [
      "procurement_staff",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "step-3-bac-resolution",
    path: "/officer/transmittals",
    label: "Step 3: BAC Resolution",
    stepNumber: "Step 5.3",
    procedureRef: "BSC-PRO-QP-95-1 §5.3",
    icon: ScrollText,
    section: "procedure_steps",
    roles: [
      "bac",
      "bac_secretariat",
      "procurement_staff",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "bac-transmittal-register",
    path: "/officer/transmittal-register",
    label: "BAC Resolution Endorsement & Transmittal Register",
    procedureRef: "BSC-PRO-QP-95-1 §5.3",
    icon: SendHorizontal,
    section: "procedure_steps",
    roles: [
      "bac",
      "bac_secretariat",
      "procurement_staff",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "step-4-prepare-rfq",
    path: "/rfq-management",
    label: "Step 4: Prepare RFQ Sheet",
    stepNumber: "Step 5.4",
    procedureRef: "BSC-PRO-QP-95-1 §5.4",
    icon: FileSpreadsheet,
    section: "procedure_steps",
    roles: [
      "procurement_staff",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "steps-4-6-rfq-philgeps",
    path: "/officer/rfq-distribution",
    label: "Steps 4–6: RFQ & PhilGEPS",
    stepNumber: "Steps 5.4–5.6",
    procedureRef: "BSC-PRO-QP-95-1 §5.5",
    icon: Layers,
    section: "procedure_steps",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "admin",
    ],
    roleLabels: {
      procurement_staff: "Step 7: Forward Quotes for AOQ",
    },
  },
  {
    id: "step-6-philgeps-posting",
    path: "/officer/philgeps",
    label: "Step 6: PhilGEPS Posting",
    stepNumber: "Step 5.6",
    procedureRef: "BSC-PRO-QP-95-1 §5.6",
    icon: Globe,
    section: "procedure_steps",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "step-9-prepare-notice",
    path: "/officer/notices",
    label: "Step 9: Prepare Notice of Award",
    stepNumber: "Step 5.9",
    procedureRef: "BSC-PRO-QP-95-1 §5.9",
    icon: FileText,
    section: "procedure_steps",
    roles: [
      "procurement_staff",
      "hope",
      "administrative_approver",
      "admin",
    ],
    roleLabels: {
      hope: "Steps 8–9: Approve Award & Notice",
    },
  },
  {
    id: "steps-9-10-serve-notice",
    path: "/officer/notices-serving",
    label: "Steps 9–10: Deliver Notice of Award",
    stepNumber: "Step 5.10",
    procedureRef: "BSC-PRO-QP-95-1 §5.10",
    icon: Send,
    section: "procedure_steps",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "steps-11-12-prepare-sign-po",
    path: "/purchase-orders",
    label: "Steps 11–13: Prepare & Release PO",
    stepNumber: "Steps 5.11–5.12",
    procedureRef: "BSC-PRO-QP-95-1 §5.11",
    icon: FileCheck,
    section: "procedure_steps",
    roles: [
      "procurement_staff",
      "bac",
      "bac_secretariat",
      "budget_officer",
      "hope",
      "administrative_approver",
      "admin",
    ],
    roleLabels: {
      bac: "Steps 7–8: Compare Quotes (AOQ)",
      bac_secretariat: "Steps 7–8: Compare Quotes (AOQ)",
      procurement_staff: "Step 11: Prepare Purchase Order",
      budget_officer: "Step 12: Certify Funds & Sign PO",
      hope: "Step 12: Sign Purchase Orders",
    },
  },
  {
    id: "step-13-release-po",
    path: "/officer/releasing",
    label: "Steps 11–13: Prepare & Release PO",
    stepNumber: "Step 5.13",
    procedureRef: "BSC-PRO-QP-95-1 §5.13",
    icon: FileCheck,
    section: "procedure_steps",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "steps-14-15-deliveries",
    path: "/officer/delivery-monitoring",
    label: "Steps 14–15: Deliveries & Reminders",
    stepNumber: "Steps 5.14–5.15",
    procedureRef: "BSC-PRO-QP-95-1 §5.15",
    icon: Truck,
    section: "procedure_steps",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },

  // ── Section 3: Budget, Records & Reports ──
  {
    id: "budget-control",
    path: "/budgets",
    label: "Budget Control & Allotments",
    icon: WalletCards,
    section: "reference_reports",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "budget_officer",
      "administrative_approver",
      "admin",
    ],
  },
  {
    id: "supplier-evaluation",
    path: "/supplier-evaluation-form",
    label: "Rate a Supplier (Evaluation)",
    icon: Star,
    section: "reference_reports",
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "suppliers-registry",
    path: "/suppliers",
    label: "Supplier Directory",
    icon: UsersRound,
    section: "reference_reports",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "documents",
    path: "/documents",
    label: "Uploaded Documents",
    icon: Paperclip,
    section: "reference_reports",
    roles: [
      "end_user",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "administrative_approver",
      "admin",
    ],
  },
  {
    id: "analytics",
    path: "/analytics",
    label: "Reports & Analytics",
    icon: Boxes,
    section: "reference_reports",
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "administrative_approver",
      "bac",
      "bac_secretariat",
      "hope",
      "budget_officer",
      "supplier_contractor",
      "admin",
    ],
  },
  {
    id: "forecast",
    path: "/officer/forecast",
    label: "Procurement Forecast",
    icon: LineChart,
    section: "reference_reports",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "audit-trail",
    path: "/audit",
    label: "Activity & Audit History",
    icon: ReceiptText,
    section: "reference_reports",
    roles: [
      "end_user",
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "pmr-history",
    path: "/pmr-history",
    label: "Past Monitoring Records (PMR)",
    icon: ReceiptText,
    section: "reference_reports",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "supplier_contractor",
      "admin",
    ],
  },

  // ── Section 4: System & Forms ──
  {
    id: "forms-hub",
    path: "/form-templates",
    label: "Official Forms Hub (Annex A–H)",
    icon: FileSpreadsheet,
    section: "administration",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "procurement_staff",
      "admin",
    ],
  },
  {
    id: "best-value-policy",
    path: "/best-value-policy",
    label: "Best Value Policy (RA 12009)",
    icon: Scale,
    section: "administration",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "system-setup",
    path: "/setup",
    label: "System & Signatory Setup",
    icon: Settings2,
    section: "administration",
    roles: [
      "procurement_officer",
      "procurement_officer_i",
      "procurement_officer_ii",
      "admin",
    ],
  },
  {
    id: "test-records",
    path: "/test-records",
    label: "Test Records Archive",
    icon: Archive,
    section: "administration",
    roles: ["admin"],
  },
];

// ─── Accessible Theme Toggle (Icon + Explicit Text, min-h-12) ─────────────────
function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`inline-flex min-h-12 items-center gap-2.5 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-5 w-5 shrink-0 text-[#881337]" aria-hidden="true" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}

// ─── Main Accessible Layout Shell ─────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedOfficeName, setSelectedOfficeName] = useState(
    user?.officeName || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.officeName) {
      setSelectedOfficeName(user.officeName);
    }
  }, [user?.officeName]);

  const utils = trpc.useUtils();
  const updateMyOfficeMutation = trpc.auth.updateMyOffice.useMutation({
    onSuccess: () => {
      toast.success("Your office assignment has been saved.");
      setEditProfileOpen(false);
      void utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rawRole = (user?.role || "end_user") as PersistedUserRole;
  const currentRole = (user?.role || "end_user") as ProcurementRole;
  const roleLabel = user
    ? currentRole === "hope"
      ? "HoPE (College President)"
      : OFFICIAL_ROLE_LABELS[currentRole] ??
        OFFICIAL_ROLE_LABELS[normalizeProcurementRole(rawRole)] ??
        "End-User"
    : OFFICIAL_ROLE_LABELS.end_user;

  // Strict role-gated navigation filter matching Section 5 & staff/officer separation
  const allVisible = NAV_ITEMS.filter((item) => {
    if (currentRole === "admin") return true;

    if (currentRole === "procurement_staff") {
      const allowedStaffPaths = [
        "/dashboard",
        "/pmr-registry",
        "/rfq-management",
        "/officer/rfq-distribution",
        "/officer/transmittals",
        "/officer/transmittal-register",
        "/officer/notices",
        "/purchase-orders",
        "/form-templates",
        "/analytics",
      ];
      return allowedStaffPaths.includes(item.path);
    }

    const isOfficer =
      currentRole === "procurement_officer" ||
      currentRole === "procurement_officer_i" ||
      currentRole === "procurement_officer_ii" ||
      rawRole === "supply_officer";

    if (isOfficer) {
      const allowedOfficerPaths = [
        "/dashboard",
        "/officer/pr-verification",
        "/officer/rfq-distribution",
        "/officer/philgeps",
        "/officer/transmittals",
        "/officer/transmittal-register",
        "/officer/notices-serving",
        "/officer/releasing",
        "/officer/delivery-monitoring",
        "/supplier-evaluation-form",
        "/budgets",
        "/analytics",
        "/officer/forecast",
        "/audit",
        "/pmr-history",
        "/best-value-policy",
        "/setup",
        "/form-templates",
      ];
      return allowedOfficerPaths.includes(item.path);
    }

    if (item.path === "/purchase-requests" && currentRole !== "end_user") {
      return false;
    }

    return item.roles.includes(currentRole);
  });

  const getLabel = (item: NavItemConfig) => {
    if (item.roleLabels?.[currentRole]) {
      return item.roleLabels[currentRole]!;
    }
    return item.label;
  };

  const visibleNavigation = allVisible.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      getLabel(item).toLowerCase().includes(q) ||
      (item.stepNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  const grouped = visibleNavigation.reduce<Record<NavSectionId, NavItemConfig[]>>(
    (acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    },
    {
      workspace: [],
      procedure_steps: [],
      reference_reports: [],
      administration: [],
    }
  );

  const handleLogout = async () => {
    await logout();
    setLocation("/access");
  };

  const userInitials = (user?.name || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-[#090d16] px-6 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-[#881337] dark:text-[#fda4af]" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Loading your ProcureWise workspace...
          </p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated guard ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-[#090d16] px-5 transition-colors">
        <div className="w-full max-w-md rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#d2b058]/50 bg-white p-1 shadow-md">
            <img
              src="/bsc-logo.jpg"
              alt="Batanes State College"
              className="h-full w-full rounded-xl object-contain"
            />
          </div>
          <ShieldCheck className="mx-auto mt-6 h-10 w-10 text-[#881337] dark:text-[#fda4af]" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
            Authorized Access Only
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Please sign in to open your Batanes State College procurement workspace.
          </p>
          <Link
            href="/access"
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#881337] px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-[#70102e]"
          >
            Sign In to ProcureWise
          </Link>
        </div>
      </div>
    );
  }

  // ── Accessible Sidebar Nav Item (min-h-12, text-base font-semibold) ────────
  const renderNavItem = (item: NavItemConfig) => {
    const label = getLabel(item);
    const active = location === item.path;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setLocation(item.path);
          setMenuOpen(false);
        }}
        aria-current={active ? "page" : undefined}
        className={[
          "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold transition-colors",
          active
            ? "bg-[#881337] text-white shadow-sm"
            : "text-slate-700 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        ].join(" ")}
      >
        <Icon
          className={[
            "h-5 w-5 shrink-0",
            active
              ? "text-white"
              : "text-[#881337] dark:text-rose-400",
          ].join(" ")}
          aria-hidden="true"
        />
        <span className="flex-1 leading-snug break-words">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground transition-colors duration-200 print:bg-white">
      <NotificationToastListener />

      {/* ── Global Top Header Bar (No Standalone Icons, min-h-16) ───────────── */}
      <header className="sticky top-0 z-30 flex min-h-16 w-full flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900 print:hidden">
        {/* Left Section: Mobile Menu Button + Institutional Branding + Active Role Pill */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Mobile Menu Trigger (min-h-12 min-w-12, Icon + Text) */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-bold text-slate-800 transition-colors hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Menu className="h-5 w-5 shrink-0 text-[#881337] dark:text-rose-400" aria-hidden="true" />
            <span>Menu</span>
          </button>

          {/* Institutional Logo & Title */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl py-1 pr-2 focus-visible:outline-none"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[#d2b058]/50 bg-white p-0.5 shadow-xs">
              <img
                src="/bsc-logo.jpg"
                alt="Batanes State College Logo"
                className="h-full w-full rounded-lg object-contain"
              />
            </div>
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-lg font-extrabold leading-tight text-slate-900 dark:text-white">
                ProcureWise
              </p>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Batanes State College
              </p>
            </div>
          </Link>

          {/* Explicit Active Role Context Indicator Pill */}
          <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <UserCheck
              className="h-4 w-4 shrink-0 text-[#881337] dark:text-rose-400"
              aria-hidden="true"
            />
            <span>
              Signed in as:{" "}
              <strong className="text-slate-900 dark:text-white">
                {roleLabel}
              </strong>
            </span>
          </div>
        </div>

        {/* Right Section: Accessible Utility Triggers (All min-h-12 with Icon + Text) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Alerts / Notifications Trigger */}
          <NotificationCenterDrawer triggerVariant="accessible" />

          {/* Dark / Light Mode Toggle */}
          <ThemeToggle className="hidden md:inline-flex" />

          {/* Help Guide Trigger */}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="hidden sm:inline-flex min-h-12 items-center gap-2.5 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <HelpCircle
              className="h-5 w-5 shrink-0 text-[#881337] dark:text-rose-400"
              aria-hidden="true"
            />
            <span>Help Guide</span>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="hidden sm:inline-flex min-h-12 items-center gap-2.5 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-rose-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-200"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer Overlay (w-80 max-w-[85vw]) ─────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden print:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="Mobile navigation menu"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col border-r-2 border-slate-200 bg-white p-4 text-slate-900 shadow-2xl transition-transform duration-300 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 print:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Top Close Bar */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-slate-200 pb-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 dark:text-white">
              Navigation Menu
            </p>
            <p className="truncate text-sm font-medium text-[#881337] dark:text-rose-400">
              {roleLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <X className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Close Menu</span>
          </button>
        </div>

        {/* Mobile Search */}
        <div className="mt-4">
          <label
            htmlFor="mobile-nav-search"
            className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300"
          >
            Find a Step or Page
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id="mobile-nav-search"
              type="text"
              placeholder="e.g., Step 1, RFQ, Notice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white pl-11 pr-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Mobile Navigation Links */}
        <div className="mt-5 flex-1 space-y-6 overflow-y-auto pr-1">
          {(Object.keys(NAV_SECTION_HEADERS) as NavSectionId[]).map((sectionId) => {
            const items = grouped[sectionId];
            if (!items || items.length === 0) return null;
            return (
              <div key={sectionId} className="space-y-2">
                <h2 className="px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {NAV_SECTION_HEADERS[sectionId]}
                </h2>
                <nav className="space-y-1.5" aria-label={NAV_SECTION_HEADERS[sectionId]}>
                  {items.map((item) => renderNavItem(item))}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Mobile Utility & Profile Footer */}
        <div className="mt-4 space-y-2.5 border-t-2 border-slate-200 pt-4 dark:border-slate-800">
          <div className="grid grid-cols-1 gap-2">
            <ThemeToggle className="w-full justify-center" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setHelpOpen(true);
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <HelpCircle className="h-5 w-5 shrink-0 text-[#881337] dark:text-rose-400" aria-hidden="true" />
              <span>Help Guide</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditProfileOpen(true);
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <UserCog className="h-5 w-5 shrink-0 text-[#881337] dark:text-rose-400" aria-hidden="true" />
              <span>My Profile ({userInitials})</span>
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-2.5 text-base font-bold text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Body: Desktop Sidebar (w-72) + Content Area ─────────────────── */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <aside
          aria-label="Primary Procedure Navigation"
          className="hidden lg:flex w-72 shrink-0 flex-col justify-between border-r-2 border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60 print:hidden no-print"
        >
          <div className="space-y-6">
            {/* Accessible Search Box */}
            <div>
              <label
                htmlFor="desktop-nav-search"
                className="mb-1.5 block px-1 text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                Find a Step or Page
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="desktop-nav-search"
                  ref={searchRef}
                  type="text"
                  placeholder="e.g., Step 1, RFQ, PO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white pl-11 pr-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Sequential Grouped Navigation */}
            <div className="space-y-6">
              {(Object.keys(NAV_SECTION_HEADERS) as NavSectionId[]).map(
                (sectionId) => {
                  const items = grouped[sectionId];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={sectionId}>
                      <h2 className="mb-2 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {NAV_SECTION_HEADERS[sectionId]}
                      </h2>
                      <nav
                        className="space-y-1.5"
                        aria-label={NAV_SECTION_HEADERS[sectionId]}
                      >
                        {items.map((item) => renderNavItem(item))}
                      </nav>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Bottom User & Office Assignment Card (min-h-12 interactive button) */}
          <div className="mt-8 border-t-2 border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditProfileOpen(true)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#881337] text-sm font-bold text-white">
                {userInitials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-slate-900 dark:text-white">
                  {user.name || "Procurement User"}
                </span>
                <span className="block truncate text-sm font-medium text-[#881337] dark:text-rose-400">
                  Edit Office / Profile
                </span>
              </span>
              <UserCog
                className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300"
                aria-hidden="true"
              />
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1 overflow-x-auto px-4 py-6 sm:px-6 md:px-8 lg:py-8 pb-14 print:p-0">
            <div className="mx-auto w-full max-w-[1440px]">{children}</div>
          </main>
        </div>
      </div>

      {/* ── Edit Profile & Office Assignment Dialog ─────────────────────────── */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-lg border-2 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-slate-900 dark:text-white">
              <UserCog className="h-5 w-5 text-[#881337] dark:text-rose-400" />
              <span>My Profile &amp; Office Assignment</span>
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-300">
              Choose your Batanes State College office or department. This office will be filled in automatically on your Purchase Requests.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-base">
            <div>
              <span className="block text-sm font-bold text-slate-600 dark:text-slate-400">
                Full Name
              </span>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {user.name || "Procurement User"}
              </p>
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-600 dark:text-slate-400">
                Account Email
              </span>
              <p className="mt-1 text-base text-slate-700 dark:text-slate-300">
                {user.email || "—"}
              </p>
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-600 dark:text-slate-400">
                Assigned Workflow Role
              </span>
              <p className="mt-1 text-base font-bold text-[#881337] dark:text-rose-400">
                {roleLabel}
              </p>
            </div>
            <div>
              <label
                htmlFor="user-office-select"
                className="mb-1.5 block text-base font-bold text-slate-900 dark:text-white"
              >
                Assigned Office or Department
              </label>
              <OfficeSelect
                id="user-office-select"
                value={selectedOfficeName}
                valueMode="name"
                onChange={setSelectedOfficeName}
                placeholder="Search & select your college office..."
              />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditProfileOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updateMyOfficeMutation.isPending}
              onClick={() =>
                updateMyOfficeMutation.mutate({
                  officeName: selectedOfficeName,
                })
              }
            >
              {updateMyOfficeMutation.isPending && (
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              )}
              Save My Office
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Help & Procedure Guide Dialog ──────────────────────────────────── */}
      <HelpSupportDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
