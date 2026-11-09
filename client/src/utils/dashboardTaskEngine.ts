export type DashboardRoleKey =
  | "end_user"
  | "procurement_officer_ii"
  | "procurement_staff"
  | "procurement_officer_i"
  | "bac"
  | "bac_secretariat"
  | "budget_officer"
  | "hope"
  | "admin"
  | string;

export type CanonicalPrStatus =
  | "DRAFT"
  | "SUBMITTED_FOR_VERIFICATION"
  | "RETURNED_FOR_CORRECTION"
  | "VERIFIED_PENDING_BAC"
  | "CANVASSING_IN_PROGRESS"
  | "AWARDED_PENDING_PO"
  | "PO_RELEASED_AWAITING_DELIVERY"
  | "COMPLETED";

export interface DashboardRequestItem {
  id: number;
  prNumber: string;
  purpose: string;
  category?: string | null;
  departmentName?: string | null;
  totalEstimate?: number | string | null;
  status: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  latestReturnReason?: string | null;
  latestRejectionReason?: string | null;
  isOverdueDelivery?: boolean;
}

export interface ResolvedPrimaryTask {
  roleLabel: string;
  urgencyLabel: string;
  stepNumber: string;
  title: string;
  explanation: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  primaryCtaIcon: "arrow" | "check" | "plus";
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  secondaryCtaIcon: "plus" | "eye";
  pendingTaskCount: number;
  targetRequestId?: number;
}

export interface PlainStatusMicrocopy {
  canonicalStatus: CanonicalPrStatus;
  badgeLabel: string;
  description: string;
  iconName:
    | "pencil"
    | "clock"
    | "alert"
    | "scroll"
    | "send"
    | "award"
    | "truck"
    | "check";
  tone: "slate" | "amber" | "rose" | "blue" | "emerald";
}

/**
 * Step 3: Plain-Language Microcopy Dictionary for Statuses
 * Maps every database status enum to non-technical badge labels and plain explanations.
 */
export const STATUS_MICROCOPY_DICTIONARY: Record<CanonicalPrStatus, PlainStatusMicrocopy> = {
  DRAFT: {
    canonicalStatus: "DRAFT",
    badgeLabel: "Draft Not Submitted",
    description:
      "This request is saved on your computer and has not yet been sent to the Procurement Office.",
    iconName: "pencil",
    tone: "slate",
  },
  SUBMITTED_FOR_VERIFICATION: {
    canonicalStatus: "SUBMITTED_FOR_VERIFICATION",
    badgeLabel: "Step 1: Checking Budget & Items",
    description:
      "The Procurement Officer is currently checking your PPMP budget plan and item descriptions.",
    iconName: "clock",
    tone: "amber",
  },
  RETURNED_FOR_CORRECTION: {
    canonicalStatus: "RETURNED_FOR_CORRECTION",
    badgeLabel: "Needs Your Correction",
    description:
      "This request was returned by the Procurement Office. Tap the card above to see the note and fix it.",
    iconName: "alert",
    tone: "rose",
  },
  VERIFIED_PENDING_BAC: {
    canonicalStatus: "VERIFIED_PENDING_BAC",
    badgeLabel: "Step 3: Preparing BAC Resolution",
    description:
      "Verified. The BAC Secretariat is preparing the official procurement resolution.",
    iconName: "scroll",
    tone: "blue",
  },
  CANVASSING_IN_PROGRESS: {
    canonicalStatus: "CANVASSING_IN_PROGRESS",
    badgeLabel: "Step 5: Getting Supplier Quotes",
    description:
      "Request for Quotation (RFQ) sheets have been delivered to suppliers. Waiting for price bids.",
    iconName: "send",
    tone: "amber",
  },
  AWARDED_PENDING_PO: {
    canonicalStatus: "AWARDED_PENDING_PO",
    badgeLabel: "Step 9: Winner Chosen",
    description:
      "The winning supplier was selected. Notice of Award is being prepared for the College President.",
    iconName: "award",
    tone: "emerald",
  },
  PO_RELEASED_AWAITING_DELIVERY: {
    canonicalStatus: "PO_RELEASED_AWAITING_DELIVERY",
    badgeLabel: "Step 13: Order Placed with Supplier",
    description:
      "The Purchase Order was released. The supplier has up to 30 days to deliver the items.",
    iconName: "truck",
    tone: "blue",
  },
  COMPLETED: {
    canonicalStatus: "COMPLETED",
    badgeLabel: "Complete & Delivered",
    description:
      "Items have arrived, passed physical inspection, and the transaction is complete.",
    iconName: "check",
    tone: "emerald",
  },
};

/**
 * Normalizes any persisted or canonical status string into one of the 8 canonical status keys.
 */
export function normalizeToCanonicalStatus(rawStatus: string): CanonicalPrStatus {
  const normalized = (rawStatus || "").trim().toUpperCase();
  if (normalized in STATUS_MICROCOPY_DICTIONARY) {
    return normalized as CanonicalPrStatus;
  }

  switch (rawStatus?.trim().toLowerCase()) {
    case "draft":
      return "DRAFT";
    case "procurement_review":
    case "submitted":
    case "submitted_for_verification":
      return "SUBMITTED_FOR_VERIFICATION";
    case "returned":
    case "rejected":
    case "returned_for_correction":
      return "RETURNED_FOR_CORRECTION";
    case "approval_review":
    case "bac_review":
    case "budget_review":
    case "supply_review":
    case "verified_pending_bac":
      return "VERIFIED_PENDING_BAC";
    case "rfq":
    case "canvassing_in_progress":
      return "CANVASSING_IN_PROGRESS";
    case "approved":
    case "awarded_pending_po":
      return "AWARDED_PENDING_PO";
    case "po":
    case "po_issued":
    case "po_released_awaiting_delivery":
      return "PO_RELEASED_AWAITING_DELIVERY";
    case "delivered":
    case "pmr_logged":
    case "closed":
    case "completed":
      return "COMPLETED";
    default:
      return "SUBMITTED_FOR_VERIFICATION";
  }
}

export function getPlainStatusMicrocopy(rawStatus: string): PlainStatusMicrocopy {
  const canonical = normalizeToCanonicalStatus(rawStatus);
  return STATUS_MICROCOPY_DICTIONARY[canonical];
}

export function formatRoleDisplayName(userRole: DashboardRoleKey): string {
  const lower = (userRole || "end_user").toLowerCase();
  switch (lower) {
    case "end_user":
    case "user":
      return "End-User (Department Staff / Faculty)";
    case "procurement_officer_ii":
    case "procurement_officer":
    case "supply_officer":
      return "Procurement Officer II (Verification & Oversight)";
    case "procurement_staff":
      return "Procurement Staff (Admin / Encoder)";
    case "procurement_officer_i":
      return "Procurement Officer I (Canvasser & Releasing Agent)";
    case "bac":
    case "bac_secretariat":
    case "administrative_approver":
      return "BAC Secretariat / Committee Member";
    case "budget_officer":
      return "Budget Officer & College Accountant";
    case "hope":
      return "College President (HoPE)";
    case "admin":
      return "System Administrator";
    default:
      return "End-User (Department Staff / Faculty)";
  }
}

/**
 * Pure priority-resolution engine (`resolvePrimaryTask`) that computes the user's
 * single highest-priority pending action based on their active role and current requests list.
 */
export function resolvePrimaryTask(
  userRole: DashboardRoleKey,
  requestsList: DashboardRequestItem[] = []
): ResolvedPrimaryTask {
  const role = (userRole || "end_user").toLowerCase();
  const roleLabel = formatRoleDisplayName(role);

  const byCanonical = (target: CanonicalPrStatus) =>
    requestsList.filter((req) => normalizeToCanonicalStatus(req.status) === target);

  const returnedList = byCanonical("RETURNED_FOR_CORRECTION");
  const draftList = byCanonical("DRAFT");
  const unverifiedList = byCanonical("SUBMITTED_FOR_VERIFICATION");
  const pendingBacList = byCanonical("VERIFIED_PENDING_BAC");
  const canvassingList = byCanonical("CANVASSING_IN_PROGRESS");
  const awardedPendingPoList = byCanonical("AWARDED_PENDING_PO");
  const poReleasedList = byCanonical("PO_RELEASED_AWAITING_DELIVERY");
  const overdueDeliveries = requestsList.filter((req) => Boolean(req.isOverdueDelivery));

  // 1. END-USER (Department Faculty / Staff)
  if (role === "end_user" || role === "user") {
    if (returnedList.length > 0) {
      const topReturned = returnedList[0];
      const categoryLabel = topReturned.category || "Office Supplies";
      return {
        roleLabel,
        urgencyLabel: "Needs Your Attention Today · Step 5.1",
        stepNumber: "Step 5.1",
        title: `Fix and Resubmit Request #${topReturned.prNumber} (${categoryLabel})`,
        explanation:
          topReturned.latestReturnReason ||
          "The Procurement Officer returned this request because printer ink and construction plywood were placed together. Please remove the hardware item so procurement can approve your order.",
        primaryCtaLabel: "Fix My Request Now →",
        primaryCtaUrl: "/purchase-requests",
        primaryCtaIcon: "arrow",
        secondaryCtaLabel: "Start a Brand New Request Instead",
        secondaryCtaUrl: "/purchase-requests?create=1",
        secondaryCtaIcon: "plus",
        pendingTaskCount: returnedList.length + draftList.length,
        targetRequestId: topReturned.id,
      };
    }

    if (draftList.length > 0) {
      const topDraft = draftList[0];
      const categoryLabel = topDraft.category || "Office Supplies";
      return {
        roleLabel,
        urgencyLabel: "Needs Your Attention Today · Step 5.1",
        stepNumber: "Step 5.1",
        title: `Continue Your Draft Request #${topDraft.prNumber} (${categoryLabel})`,
        explanation:
          "Continue your draft request. Complete your item list, attach your signed PPMP budget plan, and submit it to the Procurement Office for Step 5.1 verification.",
        primaryCtaLabel: "Continue My Draft Request →",
        primaryCtaUrl: "/purchase-requests",
        primaryCtaIcon: "arrow",
        secondaryCtaLabel: "Start a Brand New Request Instead",
        secondaryCtaUrl: "/purchase-requests?create=1",
        secondaryCtaIcon: "plus",
        pendingTaskCount: draftList.length,
        targetRequestId: topDraft.id,
      };
    }

    return {
      roleLabel,
      urgencyLabel: "Ready When You Are · Step 5.1",
      stepNumber: "Step 5.1",
      title: "Start a New Purchase Request for Your Department",
      explanation:
        "All of your submitted requests are moving smoothly through the Procurement Office. When your department needs supplies or equipment, start a new 4-step request with your approved PPMP file.",
      primaryCtaLabel: "Start a New Purchase Request →",
      primaryCtaUrl: "/purchase-requests?create=1",
      primaryCtaIcon: "plus",
      secondaryCtaLabel: "Preview Attached Form Copy",
      secondaryCtaUrl: "/purchase-requests",
      secondaryCtaIcon: "eye",
      pendingTaskCount: 0,
    };
  }

  // 2. PROCUREMENT OFFICER II (Verification & Oversight)
  if (
    role === "procurement_officer_ii" ||
    role === "procurement_officer" ||
    role === "supply_officer"
  ) {
    if (unverifiedList.length > 0) {
      const topIncoming = unverifiedList[0];
      const dept = topIncoming.departmentName || "Requesting Department";
      return {
        roleLabel,
        urgencyLabel: "Needs Your Attention Today · Step 5.1",
        stepNumber: "Step 5.1",
        title: `Verify Incoming Purchase Request #${topIncoming.prNumber} from ${dept}`,
        explanation:
          "Check that the attached Project Procurement Management Plan (PPMP) matches the requested items and confirm that only one item category is included under Clause 5.1.1.",
        primaryCtaLabel: "Verify This Request Now →",
        primaryCtaUrl: "/pr-verification",
        primaryCtaIcon: "check",
        secondaryCtaLabel: "Preview Attached Form Copy",
        secondaryCtaUrl: "/purchase-requests",
        secondaryCtaIcon: "eye",
        pendingTaskCount: unverifiedList.length + overdueDeliveries.length,
        targetRequestId: topIncoming.id,
      };
    }

    return {
      roleLabel,
      urgencyLabel: "Needs Your Attention Today · Step 5.15",
      stepNumber: "Step 5.15",
      title:
        overdueDeliveries.length > 0
          ? `Issue Demand / Reminder Letter for Overdue Delivery (#${overdueDeliveries[0].prNumber})`
          : "Review Supplier Deliveries & Step 5.1 Verification Queue",
      explanation:
        "All incoming Purchase Requests have been verified. Monitor supplier delivery deadlines under Step 5.15 and issue a formal Reminder or Demand Letter if any delivery exceeds 30 calendar days.",
      primaryCtaLabel: "Inspect Deliveries & Step 5.15 Queue →",
      primaryCtaUrl: "/delivery-monitoring",
      primaryCtaIcon: "arrow",
      secondaryCtaLabel: "Preview Attached Form Copy",
      secondaryCtaUrl: "/pr-verification",
      secondaryCtaIcon: "eye",
      pendingTaskCount: overdueDeliveries.length,
    };
  }

  // 3. PROCUREMENT STAFF (Admin / Encoder)
  if (role === "procurement_staff") {
    if (pendingBacList.length > 0 || unverifiedList.length > 0) {
      const target = pendingBacList[0] || unverifiedList[0];
      return {
        roleLabel,
        urgencyLabel: "Needs Your Attention Today · Step 5.2",
        stepNumber: "Step 5.2",
        title: `Log Verified Request #${target.prNumber} in PMR & Issue Tracking Slip`,
        explanation:
          "This Purchase Request passed Step 5.1 verification. Record it in the Procurement Monitoring Report (Annex C), issue its Tracking Slip, and transmit it to the BAC Secretariat.",
        primaryCtaLabel: "Log in PMR & Issue Tracking Slip →",
        primaryCtaUrl: "/pmr-archiving",
        primaryCtaIcon: "check",
        secondaryCtaLabel: "Preview Attached Form Copy",
        secondaryCtaUrl: "/bac-transmittal",
        secondaryCtaIcon: "eye",
        pendingTaskCount: pendingBacList.length + awardedPendingPoList.length,
        targetRequestId: target.id,
      };
    }

    return {
      roleLabel,
      urgencyLabel: "Needs Your Attention Today · Step 5.11",
      stepNumber: "Step 5.11",
      title:
        awardedPendingPoList.length > 0
          ? `Prepare Purchase Order (Annex H) for Approved Request #${awardedPendingPoList[0].prNumber}`
          : "Prepare Purchase Orders for Approved Abstracts of Quotations",
      explanation:
        "Generate the official Purchase Order (Annex H) from the approved Abstract of Quotations so the Budget Officer and College President can sign it.",
      primaryCtaLabel: "Prepare Purchase Order Now →",
      primaryCtaUrl: "/po",
      primaryCtaIcon: "arrow",
      secondaryCtaLabel: "Preview Attached Form Copy",
      secondaryCtaUrl: "/pmr-archiving",
      secondaryCtaIcon: "eye",
      pendingTaskCount: awardedPendingPoList.length,
    };
  }

  // 4. PROCUREMENT OFFICER I (Canvasser & Releasing Agent)
  if (role === "procurement_officer_i") {
    if (awardedPendingPoList.length > 0) {
      const topAward = awardedPendingPoList[0];
      return {
        roleLabel,
        urgencyLabel: "Needs Your Attention Today · Step 5.10",
        stepNumber: "Step 5.10",
        title: `Deliver Signed Letter of Notice (Annex G) for #${topAward.prNumber}`,
        explanation:
          "Serve the signed Letter of Notice to the winning supplier and record their acknowledgment signature before Purchase Order preparation.",
        primaryCtaLabel: "Serve Letter of Notice Now →",
        primaryCtaUrl: "/officer-releasing",
        primaryCtaIcon: "arrow",
        secondaryCtaLabel: "Preview Attached Form Copy",
        secondaryCtaUrl: "/letter-of-notice",
        secondaryCtaIcon: "eye",
        pendingTaskCount: awardedPendingPoList.length + poReleasedList.length,
        targetRequestId: topAward.id,
      };
    }

    return {
      roleLabel,
      urgencyLabel: "Needs Your Attention Today · Step 5.13",
      stepNumber: "Step 5.13",
      title:
        poReleasedList.length > 0
          ? `Release Approved Purchase Order for #${poReleasedList[0].prNumber} Within 1 Working Day`
          : "Release Approved Purchase Orders to Winning Suppliers",
      explanation:
        "Approved Purchase Orders must be released to the winning supplier within 1 working day under Step 5.13. Record the supplier's Conforme signature upon release.",
      primaryCtaLabel: "Release Purchase Order Now →",
      primaryCtaUrl: "/officer-releasing",
      primaryCtaIcon: "check",
      secondaryCtaLabel: "Preview Attached Form Copy",
      secondaryCtaUrl: "/rfq-distribution",
      secondaryCtaIcon: "eye",
      pendingTaskCount: poReleasedList.length,
    };
  }

  // 5. BAC SECRETARIAT / COMMITTEE MEMBER
  if (role === "bac" || role === "bac_secretariat" || role === "administrative_approver") {
    if (pendingBacList.length > 0) {
      const topBac = pendingBacList[0];
      return {
        roleLabel,
        urgencyLabel: "Needs Your Attention Today · Step 5.3",
        stepNumber: "Step 5.3",
        title: `Sign & Endorse BAC Resolution for Request #${topBac.prNumber}`,
        explanation:
          "Review the verified Purchase Request package and endorse the BAC Resolution recommending Small Value Procurement so RFQ canvassing can begin.",
        primaryCtaLabel: "Endorse BAC Resolution Now →",
        primaryCtaUrl: "/bac-transmittal",
        primaryCtaIcon: "check",
        secondaryCtaLabel: "Preview Attached Form Copy",
        secondaryCtaUrl: "/po",
        secondaryCtaIcon: "eye",
        pendingTaskCount: pendingBacList.length + canvassingList.length,
        targetRequestId: topBac.id,
      };
    }

    return {
      roleLabel,
      urgencyLabel: "Needs Your Attention Today · Step 5.7",
      stepNumber: "Step 5.7",
      title:
        canvassingList.length > 0
          ? `Tabulate Abstract of Quotations (AOQ) for Request #${canvassingList[0].prNumber}`
          : "Evaluate Sealed Quotations & Tabulate Abstract of Quotations (Annex F)",
      explanation:
        "Open the three received supplier price quotations, compare prices against the Approved Budget for the Contract (ABC), and sign the Abstract of Quotations (Annex F).",
      primaryCtaLabel: "Open AOQ Tabulation Workbench →",
      primaryCtaUrl: "/po",
      primaryCtaIcon: "arrow",
      secondaryCtaLabel: "Preview Attached Form Copy",
      secondaryCtaUrl: "/bac-transmittal",
      secondaryCtaIcon: "eye",
      pendingTaskCount: canvassingList.length,
    };
  }

  // 6. BUDGET OFFICER & COLLEGE ACCOUNTANT
  if (role === "budget_officer") {
    const target = awardedPendingPoList[0] || poReleasedList[0];
    return {
      roleLabel,
      urgencyLabel: "Needs Your Attention Today · Step 5.12",
      stepNumber: "Step 5.12",
      title: target
        ? `Certify Funds Availability (ORS/BURS) for Request #${target.prNumber}`
        : "Certify Funds Availability on Pending Purchase Orders (Step 5.12)",
      explanation:
        "Verify budget allotment balance and record the ORS/BURS obligation number on the Purchase Order (Annex H) before forwarding to the College President.",
      primaryCtaLabel: "Certify Funds Availability Now →",
      primaryCtaUrl: "/po",
      primaryCtaIcon: "check",
      secondaryCtaLabel: "Preview Attached Form Copy",
      secondaryCtaUrl: "/budgets",
      secondaryCtaIcon: "eye",
      pendingTaskCount: awardedPendingPoList.length,
      targetRequestId: target?.id,
    };
  }

  // 7. COLLEGE PRESIDENT (HoPE) & SYSTEM ADMIN FALLBACK
  const hopeTarget = awardedPendingPoList[0] || pendingBacList[0] || requestsList[0];
  return {
    roleLabel,
    urgencyLabel: "Needs Your Attention Today · Step 5.8 / 5.12",
    stepNumber: "Step 5.8 / 5.12",
    title: hopeTarget
      ? `Approve Award & Sign Purchase Order / Notice for #${hopeTarget.prNumber}`
      : "Review & Sign Pending Awards and Purchase Orders",
    explanation:
      "The BAC and Budget Officer have completed evaluation and funds certification. Your executive signature authorizes the Notice of Award (Annex G) and Purchase Order (Annex H).",
    primaryCtaLabel: "Approve & Sign Award Now →",
    primaryCtaUrl: "/po",
    primaryCtaIcon: "check",
    secondaryCtaLabel: "Preview Attached Form Copy",
    secondaryCtaUrl: "/letter-of-notice",
    secondaryCtaIcon: "eye",
    pendingTaskCount: awardedPendingPoList.length + pendingBacList.length,
    targetRequestId: hopeTarget?.id,
  };
}

