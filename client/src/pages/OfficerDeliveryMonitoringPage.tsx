import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { normalizeProcurementRole } from "../../../shared/procurementRules";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { DataTableToolbar } from "@/components/common/DataTableToolbar";
import { TablePagination } from "@/components/common/TablePagination";

function formatMoney(amount: number | string | null | undefined) {
  const numeric = typeof amount === "number" ? amount : Number(amount ?? 0);
  return `₱${numeric.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function OfficerDeliveryMonitoringPage() {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const isOfficerOrAdmin = role === "procurement_officer" || role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Log Goods Receipt Modal
  const [selectedPoForDelivery, setSelectedPoForDelivery] = useState<any | null>(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receivedByName, setReceivedByName] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState<"complete" | "partial">("complete");
  const [deliveryRemarks, setDeliveryRemarks] = useState("");

  // Record Inspection & Acceptance (IAR) Modal
  const [selectedPoForIar, setSelectedPoForIar] = useState<any | null>(null);
  const [iarNumber, setIarNumber] = useState("");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [inspectedByName, setInspectedByName] = useState("");
  const [acceptanceStatus, setAcceptanceStatus] = useState<"accepted" | "rejected" | "partial">("accepted");
  const [iarRemarks, setIarRemarks] = useState("");

  const utils = trpc.useUtils();

  const deliveryQuery = trpc.procurement.officer.delivery.list.useQuery(undefined, {
    retry: false,
    enabled: isOfficerOrAdmin,
  });

  const recordDeliveryMutation = trpc.procurement.officer.delivery.recordDelivery.useMutation({
    onSuccess: () => {
      toast.success("Goods receipt / delivery successfully documented.");
      setSelectedPoForDelivery(null);
      void utils.procurement.officer.delivery.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const recordIarMutation = trpc.procurement.officer.delivery.recordInspection.useMutation({
    onSuccess: () => {
      toast.success("Inspection and Acceptance Report (IAR) milestone logged.");
      setSelectedPoForIar(null);
      void utils.procurement.officer.delivery.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const items = deliveryQuery.data ?? [];

  // Metrics
  const metrics = useMemo(() => {
    let inTransit = 0;
    let delivered = 0;
    let inspected = 0;

    for (const item of items) {
      if (item.iar) {
        inspected++;
      } else if (item.deliveryReceipt || item.order.status === "delivered") {
        delivered++;
      } else {
        inTransit++;
      }
    }
    return { inTransit, delivered, inspected };
  }, [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterMode === "in_transit") {
        if (item.order.status === "delivered" || item.deliveryReceipt) return false;
      } else if (filterMode === "delivered") {
        if (!item.deliveryReceipt && item.order.status !== "delivered") return false;
        if (item.iar) return false;
      } else if (filterMode === "inspected") {
        if (!item.iar) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const poNumber = item.order.poNumber?.toLowerCase() ?? "";
        const supplier = item.supplier?.companyName?.toLowerCase() ?? "";
        const prNumber = item.purchaseRequest?.prNumber?.toLowerCase() ?? "";
        const drNum = item.deliveryReceipt?.receiptNumber?.toLowerCase() ?? "";
        const iarNum = item.iar?.iarNumber?.toLowerCase() ?? "";
        return (
          poNumber.includes(q) ||
          supplier.includes(q) ||
          prNumber.includes(q) ||
          drNum.includes(q) ||
          iarNum.includes(q)
        );
      }
      return true;
    });
  }, [items, filterMode, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMode]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenLogDelivery = (item: any) => {
    setSelectedPoForDelivery(item);
    setReceiptNumber(`DR-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`);
    setReceivedByName(user?.name || "");
    setDeliveryStatus("complete");
    setDeliveryRemarks("");
  };

  const handleConfirmLogDelivery = () => {
    if (!selectedPoForDelivery || !receiptNumber.trim()) {
      toast.error("Delivery Receipt number is required.");
      return;
    }
    recordDeliveryMutation.mutate({
      purchaseOrderId: selectedPoForDelivery.order.id,
      receiptNumber: receiptNumber.trim(),
      receivedByName: receivedByName.trim() || undefined,
      deliveryStatus,
      remarks: deliveryRemarks.trim() || undefined,
    });
  };

  const handleOpenRecordIar = (item: any) => {
    setSelectedPoForIar(item);
    setIarNumber(`IAR-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`);
    setInspectionDate(new Date().toISOString().split("T")[0]);
    setInspectedByName(user?.name || "Inspection Officer");
    setAcceptanceStatus("accepted");
    setIarRemarks("Inspected and verified compliant with PO terms and technical specifications.");
  };

  const handleConfirmRecordIar = () => {
    if (!selectedPoForIar || !iarNumber.trim() || !inspectedByName.trim()) {
      toast.error("IAR number and Inspector name are required.");
      return;
    }
    recordIarMutation.mutate({
      purchaseOrderId: selectedPoForIar.order.id,
      iarNumber: iarNumber.trim(),
      inspectionDate: new Date(inspectionDate),
      inspectedByName: inspectedByName.trim(),
      acceptanceStatus,
      remarks: iarRemarks.trim() || undefined,
    });
  };

  if (!isOfficerOrAdmin) {
    return (
      <div className="mx-auto max-w-4xl py-12 px-4 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This workbench is strictly mandated for the Procurement Officer to monitor supplier delivery timelines, goods receipt, and inspection acceptance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#881337]/10 text-[#881337] dark:bg-[#881337]/20 dark:text-rose-300">
                <Boxes className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Delivery & Inspection Monitoring
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track supplier delivery timelines, goods receipt milestones, and final inspection and acceptance (IAR).
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void utils.procurement.officer.delivery.list.invalidate()}
              className="h-8 gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Orders in Transit</span>
            <span className="rounded-md bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Truck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.inTransit}</div>
          <p className="mt-1 text-[11px] text-slate-500">Released to supplier, awaiting delivery</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Delivered — Pending IAR</span>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <PackageCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.delivered}</div>
          <p className="mt-1 text-[11px] text-slate-500">Receipt confirmed, awaiting inspection</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">IAR Inspection Complete</span>
            <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.inspected}</div>
          <p className="mt-1 text-[11px] text-slate-500">Formally inspected & accepted</p>
        </div>
      </div>

      {/* Reusable Excel-Style Search, Filter & Pagination Toolbar */}
      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by PO number, supplier name, PR number, DR, or IAR..."
        statusFilter={filterMode}
        onStatusChange={setFilterMode}
        statusOptions={[
          { label: `All Orders (${items.length})`, value: "ALL" },
          { label: `In Transit (${metrics.inTransit})`, value: "in_transit" },
          { label: `Delivered (${metrics.delivered})`, value: "delivered" },
          { label: `Inspected (${metrics.inspected})`, value: "inspected" },
        ]}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      {/* Monitored Orders Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Purchase Order Delivery & Inspection Register</h3>
            <p className="text-sm text-slate-500">Monitor supplier fulfillment timelines, delivery receipts, and inspection reports.</p>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="my-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              No matching records found
            </p>
            <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
              We couldn't find any entries matching "{searchQuery}". Try checking for typos or resetting your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterMode("ALL");
              }}
              className="mt-4 min-h-12 rounded-xl bg-[#881337] px-6 py-3 text-base font-bold text-white hover:bg-[#6b0f2b]"
            >
              Clear Filters & Show All Records
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-base">
                <thead className="border-b-2 border-slate-200 bg-slate-50/75 text-sm dark:border-slate-800 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">PO Number & PR</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Supplier</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Total Amount</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Scheduled Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Delivery Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">IAR Milestone</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((item) => {
                    const po = item.order;
                    const isDelivered = Boolean(item.deliveryReceipt) || po.status === "delivered";
                    const isInspected = Boolean(item.iar);

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{po.poNumber}</div>
                          <div className="text-sm text-slate-500">{item.purchaseRequest?.prNumber || "PR #" + po.purchaseRequestId}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {item.supplier?.companyName || "Supplier #" + po.supplierId}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {formatMoney(po.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {po.scheduledDeliveryDate
                            ? new Date(po.scheduledDeliveryDate).toLocaleDateString("en-PH")
                            : "15 days from PO"}
                        </td>
                        <td className="px-4 py-3">
                          {isDelivered ? (
                            <div>
                              <Badge variant="outline" className="border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Goods Receipt Logged
                              </Badge>
                              {item.deliveryReceipt?.receiptNumber && (
                                <div className="font-mono text-sm text-slate-500 mt-0.5">
                                  {item.deliveryReceipt.receiptNumber}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs">
                              <Truck className="mr-1 h-3.5 w-3.5" /> In Transit
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.iar ? (
                            <div>
                              <Badge variant="outline" className="border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {item.iar.acceptanceStatus === "accepted" ? "IAR Accepted" : item.iar.acceptanceStatus}
                              </Badge>
                              <div className="font-mono text-sm text-slate-500 mt-0.5">
                                {item.iar.iarNumber}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-amber-600 font-medium">Pending IAR</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isDelivered && (
                              <Button
                                onClick={() => handleOpenLogDelivery(item)}
                                className="min-h-12 px-4 text-base font-bold bg-[#881337] hover:bg-[#70102e] text-white"
                              >
                                <PackageCheck className="mr-1.5 h-4 w-4" />
                                Log Delivery
                              </Button>
                            )}
                            {isDelivered && !isInspected && (
                              <Button
                                onClick={() => handleOpenRecordIar(item)}
                                className="min-h-12 px-4 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                Record IAR
                              </Button>
                            )}
                            {isInspected && (
                              <Badge variant="outline" className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs">
                                Milestones Complete
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Log Delivery Modal */}
      {selectedPoForDelivery && (
        <Dialog open={Boolean(selectedPoForDelivery)} onOpenChange={(open) => !open && setSelectedPoForDelivery(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Log Goods Delivery / Receipt
              </DialogTitle>
              <DialogDescription className="text-xs">
                PO: {selectedPoForDelivery.order.poNumber} · Supplier: {selectedPoForDelivery.supplier?.companyName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Delivery Receipt (DR) / Waybill Number: <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="e.g. DR-2026-90412"
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Received by Personnel Name:
                </Label>
                <Input
                  value={receivedByName}
                  onChange={(e) => setReceivedByName(e.target.value)}
                  placeholder="Full name of receiving officer / staff"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Delivery Status:</Label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="complete">Complete Delivery (All items accounted for)</option>
                  <option value="partial">Partial Delivery (Remaining items in subsequent batch)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Remarks / Condition:</Label>
                <Textarea
                  value={deliveryRemarks}
                  onChange={(e) => setDeliveryRemarks(e.target.value)}
                  placeholder="Inspection notes upon delivery, batch condition, or packaging remarks..."
                  className="mt-1 text-xs min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedPoForDelivery(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={recordDeliveryMutation.isPending || !receiptNumber.trim()}
                onClick={handleConfirmLogDelivery}
                className="text-xs bg-[#881337] hover:bg-[#70102e] text-white"
              >
                {recordDeliveryMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Log Delivery Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Record IAR Modal */}
      {selectedPoForIar && (
        <Dialog open={Boolean(selectedPoForIar)} onOpenChange={(open) => !open && setSelectedPoForIar(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Record Inspection & Acceptance (IAR)
              </DialogTitle>
              <DialogDescription className="text-xs">
                PO: {selectedPoForIar.order.poNumber} · Supplier: {selectedPoForIar.supplier?.companyName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  IAR Number: <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={iarNumber}
                  onChange={(e) => setIarNumber(e.target.value)}
                  placeholder="e.g. IAR-2026-0042"
                  className="mt-1 h-8 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inspection Date:</Label>
                <Input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Inspected By (Inspector / Committee): <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={inspectedByName}
                  onChange={(e) => setInspectedByName(e.target.value)}
                  placeholder="Full name of Inspector"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Acceptance Status:</Label>
                <select
                  value={acceptanceStatus}
                  onChange={(e) => setAcceptanceStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="accepted">Accepted (Full compliance with specs)</option>
                  <option value="partial">Partial Acceptance (Discrepancy noted)</option>
                  <option value="rejected">Rejected (Non-compliant items returned to supplier)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inspection Remarks:</Label>
                <Textarea
                  value={iarRemarks}
                  onChange={(e) => setIarRemarks(e.target.value)}
                  placeholder="Verification findings against technical specifications..."
                  className="mt-1 text-xs min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedPoForIar(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={recordIarMutation.isPending || !iarNumber.trim() || !inspectedByName.trim()}
                onClick={handleConfirmRecordIar}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {recordIarMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm IAR Milestone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
