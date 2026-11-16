import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import { DEFAULT_BSC_BAC_MEMBERS } from "./OfficialBacResolutionCanvas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Printer,
  ScrollText,
  Send,
  LoaderCircle,
  Eye,
  Building2,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface OfficialBacAbstractOfQuotationsProps {
  rfqId: number;
  onSuccess?: () => void;
  defaultExpanded?: boolean;
}

export function OfficialBacAbstractOfQuotations({
  rfqId,
  onSuccess,
  defaultExpanded = true,
}: OfficialBacAbstractOfQuotationsProps) {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const isBac = role === "bac" || role === "bac_secretariat" || role === "admin";
  const isStaff = role === "procurement_staff" || role === "procurement_officer" || role === "admin";
  const [, setLocation] = useLocation();

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [chairpersonName, setChairpersonName] = useState("DOREEN C. CASTILLO");
  const [openingLocation, setOpeningLocation] = useState("BAC Conference Room, Batanes State College");
  const [openingDateTime, setOpeningDateTime] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [openingRemarks, setOpeningRemarks] = useState(
    "Quotation envelopes opened pursuant to Section 5.7.1 of the procurement rules setting forth names of bidders and corresponding price quotations."
  );

  const dashboard = trpc.procurement.dashboard.useQuery(undefined, { retry: false });
  const setup = trpc.procurement.setup.details.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  const refresh = () => {
    void utils.procurement.dashboard.invalidate();
    onSuccess?.();
  };

  const forwardToBac = trpc.procurement.rfqs.forwardToBac.useMutation({
    onSuccess: () => {
      toast.success(
        "Quotations formally forwarded to BAC Chairperson for opening and preparation of Abstract of Quotations pursuant to Section 5.7.1."
      );
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const recordOpening = trpc.procurement.rfqs.recordOpening.useMutation({
    onSuccess: () => {
      toast.success("Quotation envelopes formally opened by BAC Chairperson Doreen C. Castillo (Section 5.7.1).");
      setOpenModalOpen(false);
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateAbstract = trpc.procurement.rfqs.generateAbstract.useMutation({
    onSuccess: () => {
      toast.success("Official Abstract of Quotations (AOQ) / Ratings prepared pursuant to Section 5.7.1.");
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const approveAbstract = trpc.procurement.rfqs.approveAbstract.useMutation({
    onSuccess: () => {
      toast.success("Abstract of Quotations approved by BAC. Award recommended to HoPE pursuant to Step 5.8.");
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  // Find relevant records
  const rfq = useMemo(() => dashboard.data?.rfqs.find((r) => r.id === rfqId), [dashboard.data?.rfqs, rfqId]);
  const pr = useMemo(
    () => dashboard.data?.purchaseRequests.find((p) => p.id === rfq?.purchaseRequestId),
    [dashboard.data?.purchaseRequests, rfq]
  );
  const items = useMemo(
    () => (dashboard.data?.purchaseRequestItems ?? []).filter((i) => i.purchaseRequestId === pr?.id),
    [dashboard.data?.purchaseRequestItems, pr]
  );
  const quotes = useMemo(
    () => (dashboard.data?.supplierQuotations ?? []).filter((q) => q.rfqId === rfqId),
    [dashboard.data?.supplierQuotations, rfqId]
  );
  const abstract = useMemo(
    () => dashboard.data?.quotationAbstracts.find((a) => a.rfqId === rfqId),
    [dashboard.data?.quotationAbstracts, rfqId]
  );

  const supplierMap = useMemo(() => {
    return new Map((setup.data?.suppliers ?? []).map((s) => [s.id, s]));
  }, [setup.data?.suppliers]);

  // Check opening audit event
  const openingAudit = useMemo(() => {
    return dashboard.data?.auditEvents.find(
      (a) => a.entityType === "rfq" && a.entityId === rfqId && a.action === "quotations_opened_by_bac_chairperson"
    );
  }, [dashboard.data?.auditEvents, rfqId]);

  const openingDetails = openingAudit?.details as any;
  const isOpened = Boolean(openingAudit || abstract);

  // Sorting quotes: compliant first by totalPrice ascending
  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((a, b) => {
      if (a.isCompliant !== b.isCompliant) return b.isCompliant - a.isCompliant;
      return Number(a.totalPrice) - Number(b.totalPrice);
    });
  }, [quotes]);

  const winningQuote = sortedQuotes.find((q) => q.isCompliant === 1);
  const totalAbc = useMemo(() => {
    if (items.length > 0) {
      return items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.estimatedUnitCost), 0);
    }
    return Number(pr?.totalEstimate || 53600);
  }, [items, pr]);

  const winningPrice = winningQuote ? Number(winningQuote.totalPrice) : null;
  const savings = winningPrice !== null ? totalAbc - winningPrice : 0;
  const savingsPct = winningPrice !== null && totalAbc > 0 ? (savings / totalAbc) * 100 : 0;

  if (!rfq) return null;

  return (
    <div className="rounded-xl border border-[#d5cfc4] dark:border-[#384554] bg-white dark:bg-[#151c24] overflow-hidden shadow-xs">
      {/* Top Section 5.7 Statutory Bar */}
      <div className="bg-[#fcfaf5] dark:bg-[#1a232d] border-b border-[#e9e3d8] dark:border-[#2e3b4a] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#7b1e1e]/10 p-2.5 text-[#7b1e1e] dark:text-[#f87171] mt-0.5 shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#7b1e1e] dark:text-[#f87171]">
                  Procedure 5.7 / Section 5.7.1
                </span>
                <span className="text-xs font-semibold text-[#1f2937] dark:text-stone-100">
                  Forward to BAC for Preparation of Abstract of Quotations
                </span>
                {abstract?.status === "approved" ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    BAC Approved & Endorsed (Step 5.8)
                  </Badge>
                ) : abstract ? (
                  <Badge className="bg-amber-600 text-white text-[10px]">
                    <Clock className="mr-1 h-3 w-3" />
                    AOQ Prepared · Awaiting BAC Endorsement
                  </Badge>
                ) : isOpened ? (
                  <Badge className="bg-blue-600 text-white text-[10px]">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Opened by BAC Chairperson
                  </Badge>
                ) : rfq.status === "forwarded_to_bac" ? (
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 text-[10px]">
                    <Clock className="mr-1 h-3 w-3" />
                    Forwarded to BAC for Opening
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    {quotes.length}/3 Quotes Canvassed
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#556170] dark:text-[#a0aec0] max-w-3xl">
                <em>
                  &ldquo;5.7.1 After the deadline for submission of quotations, the same shall be forwarded to BAC Chairperson
                  for opening. An Abstract of Quotations/ Ratings is prepared setting forth the names of those who
                  responded to the RFQ, their corresponding price quotations.&rdquo;
                </em>{" "}
                — <strong>Procedure 5.7 Procurement Mandate</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 text-xs text-[#556170]"
            >
              {expanded ? (
                <>
                  <ChevronUp className="mr-1 h-3.5 w-3.5" />
                  Collapse Matrix
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  View AOQ Grid ({quotes.length} Quotes)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-6">
          {/* BAC Chairperson Opening Banner & Status */}
          <div className="rounded-lg border border-[#e2d8c3] dark:border-[#384554] bg-[#fbf9f4] dark:bg-[#18212b] p-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[#9a6d19] dark:text-[#eab308] mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-[#34404e] dark:text-stone-200">
                    BAC Chairperson Formal Opening of Quotations (Procedure 5.7 / Section 5.7.1)
                  </p>
                  {isOpened ? (
                    <div className="mt-1 space-y-0.5 text-[11px] text-[#4b5563] dark:text-[#94a3b8]">
                      <p>
                        Presiding Official:{" "}
                        <strong className="text-[#7b1e1e] dark:text-[#f87171]">
                          {openingDetails?.chairpersonName || "DOREEN C. CASTILLO (BAC Chairperson)"}
                        </strong>
                      </p>
                      <p>
                        Opening Venue:{" "}
                        <span>{openingDetails?.openingLocation || "BAC Conference Room, Batanes State College"}</span>
                      </p>
                      <p>
                        Date of Formal Opening:{" "}
                        <span>
                          {openingDetails?.openedAt
                            ? new Date(openingDetails.openedAt).toLocaleString("en-PH")
                            : new Date().toLocaleDateString("en-PH")}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#8a6520] dark:text-[#f8d88e]">
                      Supplier quotation envelopes are currently sealed. Pursuant to Section 5.7.1, the unopened
                      quotations must be opened by the <strong>BAC Chairperson</strong> before an Abstract of
                      Quotations can be officially prepared and ratified.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {!isOpened && isBac && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setOpenModalOpen(true)}
                    className="h-8 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818]"
                  >
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    Open Quotations (BAC Chairperson)
                  </Button>
                )}
                {!isOpened && !isBac && isStaff && rfq.status !== "forwarded_to_bac" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={quotes.length < 3 || forwardToBac.isPending}
                    onClick={() => forwardToBac.mutate({ rfqId })}
                    className="h-8 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818]"
                  >
                    {forwardToBac.isPending ? (
                      <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Forward to BAC Chairperson for Opening (Step 5.7)
                  </Button>
                )}
                {isOpened && (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs py-1 px-2.5">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                    Formally Opened
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Comparative Abstract of Quotations Table (Annex F) */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#ece8df] dark:border-[#2b3744]">
              <div>
                <h4 className="text-sm font-bold text-[#34404e] dark:text-stone-100 flex items-center gap-2">
                  <span>Abstract of Quotations / Ratings Comparative Matrix</span>
                  <span className="text-[11px] font-normal text-stone-500">
                    ({quotes.length} Responding Commercial Bidders)
                  </span>
                </h4>
                <p className="text-[11px] text-[#707c8a] dark:text-[#94a3b8] mt-0.5">
                  Official Annex F format setting forth the names of those who responded to the RFQ, their itemized price quotations, and compliance ratings.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#7b1e1e] dark:text-[#f87171]">
                  ABC Threshold: ₱{totalAbc.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {quotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 border border-dashed rounded-lg mt-3">
                No supplier quotations recorded yet for this RFQ. At least three (3) quotations are required under RA 12009.
              </div>
            ) : (
              <div className="overflow-x-auto mt-3 border border-[#e5e0d8] dark:border-[#2d3a4b] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#fbf9f4] dark:bg-[#1a232d] text-[#34404e] dark:text-stone-200 border-b border-[#e5e0d8] dark:border-[#2d3a4b]">
                      <th className="p-3 font-semibold w-12 text-center">#</th>
                      <th className="p-3 font-semibold min-w-[220px]">Purchase Item Particulars</th>
                      <th className="p-3 font-semibold w-24 text-center">Qty / Unit</th>
                      <th className="p-3 font-semibold w-32 text-right">ABC Estimated</th>
                      {sortedQuotes.map((q, idx) => {
                        const supplier = supplierMap.get(q.supplierId);
                        const isWinning = winningQuote?.id === q.id;
                        return (
                          <th
                            key={q.id}
                            className={`p-3 font-semibold min-w-[200px] border-l border-[#e5e0d8] dark:border-[#2d3a4b] ${
                              isWinning
                                ? "bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500">
                                Bidder {idx + 1}
                              </span>
                              {isWinning && (
                                <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5">
                                  LCRQ / Rank 1
                                </Badge>
                              )}
                            </div>
                            <div className="font-bold text-xs truncate mt-0.5">
                              {supplier?.companyName || `Supplier #${q.supplierId}`}
                            </div>
                            <div className="text-[10px] font-normal text-stone-500 font-mono">
                              TIN: {supplier?.tin || "Registered"}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece8df] dark:divide-[#263240]">
                    {items.map((item, itemIdx) => {
                      const estUnit = Number(item.estimatedUnitCost) || 0;
                      const qty = Number(item.quantity) || 1;
                      const itemTotal = estUnit * qty;
                      return (
                        <tr key={item.id || itemIdx} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                          <td className="p-3 text-center text-stone-500 font-mono">{itemIdx + 1}</td>
                          <td className="p-3 font-medium text-stone-900 dark:text-stone-100">
                            <div>{item.description}</div>
                            {item.specification && (
                              <div className="text-[11px] text-stone-500 italic mt-0.5">{item.specification}</div>
                            )}
                          </td>
                          <td className="p-3 text-center text-stone-700 dark:text-stone-300 font-mono">
                            {qty} {item.unit}
                          </td>
                          <td className="p-3 text-right font-mono text-stone-700 dark:text-stone-300">
                            ₱{itemTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          {sortedQuotes.map((q) => {
                            const isWinning = winningQuote?.id === q.id;
                            // Estimate per-item ratio or distribute total price across items
                            const quoteTotal = Number(q.totalPrice) || 0;
                            const share = totalAbc > 0 ? (itemTotal / totalAbc) * quoteTotal : quoteTotal;
                            return (
                              <td
                                key={q.id}
                                className={`p-3 text-right font-mono border-l border-[#ece8df] dark:border-[#263240] ${
                                  isWinning ? "bg-emerald-50/30 dark:bg-emerald-950/20 font-bold" : ""
                                }`}
                              >
                                ₱{share.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* TOTAL QUOTED ROW */}
                    <tr className="bg-[#fbf9f4] dark:bg-[#1a232d] font-bold border-t-2 border-[#d5cfc4] dark:border-[#384554]">
                      <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-xs">
                        Total Price Quotation Setting Forth Responding Bidders:
                      </td>
                      <td className="p-3 text-right font-mono text-[#7b1e1e] dark:text-[#f87171] text-xs">
                        ₱{totalAbc.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      {sortedQuotes.map((q) => {
                        const price = Number(q.totalPrice);
                        const isWinning = winningQuote?.id === q.id;
                        const isOver = price > totalAbc;
                        return (
                          <td
                            key={q.id}
                            className={`p-3 text-right font-mono text-xs border-l border-[#d5cfc4] dark:border-[#384554] ${
                              isWinning
                                ? "bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200"
                                : isOver
                                ? "text-red-600 dark:text-red-400"
                                : ""
                            }`}
                          >
                            ₱{price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                    </tr>

                    {/* DELIVERY DAYS OFFERED */}
                    <tr className="text-xs">
                      <td colSpan={4} className="p-3 text-right text-stone-600 dark:text-stone-400 font-medium">
                        Delivery Period Offered:
                      </td>
                      {sortedQuotes.map((q) => (
                        <td
                          key={q.id}
                          className="p-3 text-right border-l border-[#ece8df] dark:border-[#263240] font-mono text-[11px]"
                        >
                          {q.deliveryDays} Calendar Day(s)
                        </td>
                      ))}
                    </tr>

                    {/* COMPLIANCE / RESPONSIVENESS RATING */}
                    <tr className="text-xs bg-[#fcfaf5] dark:bg-[#17202a]">
                      <td colSpan={4} className="p-3 text-right text-stone-700 dark:text-stone-300 font-medium">
                        Section 5.7.1 Technical Compliance & Responsiveness Rating:
                      </td>
                      {sortedQuotes.map((q) => {
                        const isCompliant = q.isCompliant === 1;
                        return (
                          <td
                            key={q.id}
                            className="p-3 text-right border-l border-[#ece8df] dark:border-[#263240]"
                          >
                            <Badge
                              variant="outline"
                              className={
                                isCompliant
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 text-[10px]"
                                  : "border-red-400 bg-red-50 text-red-800 text-[10px]"
                              }
                            >
                              {isCompliant ? "COMPLIANT / RESPONSIVE" : "NON-COMPLIANT"}
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>

                    {/* FINAL BAC RATING & RANK */}
                    <tr className="text-xs font-semibold bg-[#f7f4ea] dark:bg-[#1e2733]">
                      <td colSpan={4} className="p-3 text-right text-[#7b1e1e] dark:text-[#f87171] uppercase">
                        BAC Award Recommendation Rationale:
                      </td>
                      {sortedQuotes.map((q, idx) => {
                        const isWinning = winningQuote?.id === q.id;
                        return (
                          <td
                            key={q.id}
                            className={`p-3 text-right border-l border-[#d5cfc4] dark:border-[#384554] ${
                              isWinning
                                ? "bg-emerald-100/90 dark:bg-emerald-900/50 text-emerald-950 dark:text-emerald-100 font-bold"
                                : "text-stone-500"
                            }`}
                          >
                            {isWinning ? (
                              <span className="flex items-center justify-end gap-1 text-emerald-800 dark:text-emerald-300">
                                <Award className="h-3.5 w-3.5 shrink-0" />
                                Single / Lowest Calculated Responsive Quote
                              </span>
                            ) : (
                              <span>Rank {idx + 1} (Higher Price / Variance)</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Procedure 5.8: Recommendation on the Award of Contract Panel */}
          {winningQuote && (
            <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/30 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 dark:border-emerald-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-700 text-white p-2 shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                        Procedure 5.8: Recommendation on the Award of Contract
                      </h4>
                      {abstract?.status === "approved" ? (
                        <Badge className="bg-emerald-700 text-white text-[10px] px-2 py-0.5">
                          Award Endorsed to HoPE (Step 5.8.1)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] px-2 py-0.5">
                          Awaiting BAC Endorsement
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                      <strong>Section 5.8.1:</strong> The BAC recommends to the HoPE the award of contract in favor of the supplier or contractor with the Single or Lowest Calculated and Responsive Quotation.
                    </p>
                  </div>
                </div>
                <div className="text-right sm:border-l sm:border-emerald-200 dark:sm:border-emerald-800 sm:pl-4 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                    Public Savings Generated
                  </span>
                  <p className="text-lg font-extrabold text-emerald-800 dark:text-emerald-200 font-mono">
                    ₱{savings.toLocaleString("en-PH", { minimumFractionDigits: 2 })} ({savingsPct.toFixed(1)}%)
                  </p>
                </div>
              </div>

              {/* Winner details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/80 dark:bg-[#16202a] p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                <div>
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">Winning Supplier (S/LCRQ)</span>
                  <p className="font-bold text-stone-900 dark:text-stone-100 text-sm mt-0.5">
                    {supplierMap.get(winningQuote.supplierId)?.companyName}
                  </p>
                  <p className="text-[10px] text-stone-500">TIN: {supplierMap.get(winningQuote.supplierId)?.tin || "On file"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">Offered Contract Price</span>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm mt-0.5 font-mono">
                    ₱{Number(winningQuote.totalPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-stone-500">Delivery: {winningQuote.deliveryDays} calendar days</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-stone-500 font-semibold block">Approved Budget (ABC)</span>
                  <p className="font-bold text-stone-700 dark:text-stone-300 text-sm mt-0.5 font-mono">
                    ₱{totalAbc.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-stone-500">Evaluation: Lot Basis (S/LCRQ)</p>
                </div>
              </div>
            </div>
          )}

          {/* BAC Committee Composition (Recommending Approval) */}
          <div className="border-t border-[#ece8df] dark:border-[#2b3744] pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 mb-3">
              Official BAC Committee Evaluators & Signatories:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
              {DEFAULT_BSC_BAC_MEMBERS.map((member, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50"
                >
                  <p className="font-bold text-[10px] text-stone-900 dark:text-stone-100 truncate">
                    {member.name}
                  </p>
                  <p className="text-[9px] text-[#7b1e1e] dark:text-[#f87171] font-semibold mt-0.5 truncate">
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8df] dark:border-[#2b3744] pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/print/pre-canvass-abstract?rfqId=${rfqId}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-[#7b1e1e] text-[#7b1e1e] hover:bg-[#fffaf0]"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Annex F (AOQ)
                </Button>
              </Link>
              {pr && winningQuote && (
                <>
                  <Link
                    href={`/print/bac-resolution?category=award_of_contract&prId=${pr.id}&resNo=2601-GAS2-${pr.prNumber.replace(/^PR-/, "")}&winningSupplier=${encodeURIComponent(supplierMap.get(winningQuote.supplierId)?.companyName || "")}&awardedAmount=${winningQuote.totalPrice}&rfqNo=${rfq?.rfqNumber || ""}&savings=${savings}`}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-emerald-700 text-emerald-800 hover:bg-emerald-50"
                      title="Print Official Step 5.8 BAC Resolution Recommending Award of Contract"
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Print Award Resolution (5.8)
                    </Button>
                  </Link>
                  <Link
                    href={`/officer/award-resolution?prId=${pr.id}&resNo=BAC-RES-AWARD-2026-${pr.prNumber.replace(/^PR-/, "")}&winningSupplier=${encodeURIComponent(supplierMap.get(winningQuote.supplierId)?.companyName || "")}&awardedAmount=${winningQuote.totalPrice}&rfqNo=${rfq?.rfqNumber || ""}&savings=${savings}`}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-amber-600 text-amber-800 hover:bg-amber-50"
                      title="Open BAC Resolution Studio for Step 5.8 Award Recommendation"
                    >
                      <ScrollText className="mr-1.5 h-3.5 w-3.5" />
                      Resolution Studio (Step 5.8)
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isBac && !abstract && (
                <Button
                  type="button"
                  size="sm"
                  disabled={quotes.length < 3 || generateAbstract.isPending}
                  onClick={() => generateAbstract.mutate({ rfqId })}
                  className="h-8 rounded-[4px] bg-[#7b1e1e] text-xs font-semibold text-white hover:bg-[#641818]"
                >
                  {generateAbstract.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Save & Prepare Official AOQ
                </Button>
              )}
              {isBac && abstract && abstract.status === "recommended" && winningQuote && (
                <Button
                  type="button"
                  size="sm"
                  disabled={approveAbstract.isPending}
                  onClick={() => {
                    const winSupplier = supplierMap.get(winningQuote.supplierId)?.companyName;
                    approveAbstract.mutate({
                      rfqId,
                      winningSupplierId: winningQuote.supplierId,
                      winningSupplierName: winSupplier,
                      awardedAmount: Number(winningQuote.totalPrice),
                      resolutionNumber: pr ? `2601-GAS2-${pr.prNumber.replace(/^PR-/, "")}` : undefined,
                    });
                  }}
                  className="h-8 rounded-[4px] bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm"
                  title="Section 5.8.1: The BAC recommends to the HoPE the award of contract in favor of the Single or Lowest Calculated and Responsive Quotation."
                >
                  {approveAbstract.isPending ? (
                    <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Recommend Award to HoPE (Step 5.8.1)
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Opening Recording Dialog (BAC Chairperson) */}
      <Dialog open={openModalOpen} onOpenChange={setOpenModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#7b1e1e]">
              <ShieldCheck className="h-5 w-5" />
              BAC Chairperson Formal Opening of Quotations
            </DialogTitle>
            <DialogDescription className="text-xs">
              Section 5.7.1: After the deadline for submission of quotations, the same shall be forwarded to BAC
              Chairperson for opening. Record opening location and presiding officers.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              recordOpening.mutate({
                rfqId,
                chairpersonName,
                openingLocation,
                openingDate: new Date(openingDateTime),
                remarks: openingRemarks,
              });
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div>
              <Label className="text-xs font-semibold">BAC Chairperson (Presiding)</Label>
              <Input
                value={chairpersonName}
                onChange={(e) => setChairpersonName(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Opening Venue / Conference Room</Label>
              <Input
                value={openingLocation}
                onChange={(e) => setOpeningLocation(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Opening Date & Time</Label>
              <Input
                type="datetime-local"
                value={openingDateTime}
                onChange={(e) => setOpeningDateTime(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Opening Remarks & Compliance Rationale</Label>
              <Textarea
                value={openingRemarks}
                onChange={(e) => setOpeningRemarks(e.target.value)}
                className="mt-1 min-h-18 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordOpening.isPending}
                size="sm"
                className="bg-[#7b1e1e] hover:bg-[#641818] text-white"
              >
                {recordOpening.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm Opening of Quotations
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

