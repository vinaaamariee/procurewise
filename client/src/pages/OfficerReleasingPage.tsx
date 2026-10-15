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
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

function formatMoney(amount: number | string | null | undefined) {
  const numeric = typeof amount === "number" ? amount : Number(amount ?? 0);
  return `₱${numeric.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function OfficerReleasingPage({
  initialTab = "notices",
}: {
  initialTab?: "notices" | "pos";
} = {}) {
  const { user } = useAuth();
  const role = user ? normalizeProcurementRole(user.role) : "end_user";
  const isOfficerOrAdmin = role === "procurement_officer" || role === "admin";

  const [activeTab, setActiveTab] = useState<"notices" | "pos">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Serve Notice Modal
  const [selectedNoticeForServe, setSelectedNoticeForServe] = useState<any | null>(null);
  const [noticeRecipient, setNoticeRecipient] = useState("");
  const [noticeServeDate, setNoticeServeDate] = useState(new Date().toISOString().split("T")[0]);
  const [noticeDeliveryMode, setNoticeDeliveryMode] = useState<"hand_delivery" | "courier" | "registered_mail" | "electronic_mail">("hand_delivery");
  const [noticeRemarks, setNoticeRemarks] = useState("");

  // Release PO Modal
  const [selectedPoForRelease, setSelectedPoForRelease] = useState<any | null>(null);
  const [poRecipient, setPoRecipient] = useState("");
  const [poReleaseDate, setPoReleaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [poReleaseMode, setPoReleaseMode] = useState<"in_person_pickup" | "courier" | "electronic_mail">("in_person_pickup");
  const [poAckReference, setPoAckReference] = useState("");
  const [poRemarks, setPoRemarks] = useState("");

  const utils = trpc.useUtils();

  const noticesQuery = trpc.procurement.officer.notices.list.useQuery(undefined, {
    retry: false,
    enabled: isOfficerOrAdmin,
  });

  const posQuery = trpc.procurement.officer.releasing.list.useQuery(undefined, {
    retry: false,
    enabled: isOfficerOrAdmin,
  });

  const serveNoticeMutation = trpc.procurement.officer.notices.serve.useMutation({
    onSuccess: () => {
      toast.success("Letter of Notice formally served to winning supplier.");
      setSelectedNoticeForServe(null);
      void utils.procurement.officer.notices.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const releasePoMutation = trpc.procurement.officer.releasing.release.useMutation({
    onSuccess: () => {
      toast.success("Purchase Order formally released to the awarded supplier.");
      setSelectedPoForRelease(null);
      void utils.procurement.officer.releasing.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const notices = noticesQuery.data ?? [];
  const poItems = posQuery.data ?? [];

  // Metrics
  const metrics = useMemo(() => {
    let pendingNotices = 0;
    let servedNotices = 0;
    let pendingPos = 0;
    let releasedPos = 0;

    for (const n of notices) {
      if (n.status === "served") servedNotices++;
      else pendingNotices++;
    }

    for (const p of poItems) {
      if (p.isReleased) releasedPos++;
      else pendingPos++;
    }

    return { pendingNotices, servedNotices, pendingPos, releasedPos };
  }, [notices, poItems]);

  const handleOpenServeNotice = (notice: any) => {
    setSelectedNoticeForServe(notice);
    setNoticeRecipient("");
    setNoticeServeDate(new Date().toISOString().split("T")[0]);
    setNoticeDeliveryMode("hand_delivery");
    setNoticeRemarks("");
  };

  const handleConfirmServeNotice = () => {
    if (!selectedNoticeForServe || !noticeRecipient.trim()) {
      toast.error("Recipient / Supplier representative name is required.");
      return;
    }
    serveNoticeMutation.mutate({
      noticeId: selectedNoticeForServe.id,
      servedAt: new Date(noticeServeDate),
      recipientName: noticeRecipient.trim(),
      deliveryMode: noticeDeliveryMode,
      remarks: noticeRemarks.trim() || undefined,
    });
  };

  const handleOpenReleasePo = (item: any) => {
    setSelectedPoForRelease(item);
    setPoRecipient(item.supplier?.contactPerson || "");
    setPoReleaseDate(new Date().toISOString().split("T")[0]);
    setPoReleaseMode("in_person_pickup");
    setPoAckReference("");
    setPoRemarks("");
  };

  const handleConfirmReleasePo = () => {
    if (!selectedPoForRelease || !poRecipient.trim()) {
      toast.error("Recipient name is required.");
      return;
    }
    releasePoMutation.mutate({
      purchaseOrderId: selectedPoForRelease.order.id,
      releasedAt: new Date(poReleaseDate),
      recipientName: poRecipient.trim(),
      releaseMode: poReleaseMode,
      acknowledgementReference: poAckReference.trim() || undefined,
      remarks: poRemarks.trim() || undefined,
    });
  };

  if (!isOfficerOrAdmin) {
    return (
      <div className="mx-auto max-w-4xl py-12 px-4 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This workbench is strictly mandated for the Procurement Officer to serve Letters of Notice and release Purchase Orders / Contracts.
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
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Notice & PO Releasing
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deliver and serve finalized Letters of Notice and formally release approved Purchase Orders to suppliers.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void utils.procurement.officer.notices.list.invalidate();
                void utils.procurement.officer.releasing.list.invalidate();
              }}
              className="h-8 gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("notices")}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "notices"
                ? "border-[#881337] text-[#881337] dark:border-rose-400 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            Serve Letters of Notice ({notices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "pos"
                ? "border-[#881337] text-[#881337] dark:border-rose-400 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            Release Purchase Orders & Contracts ({poItems.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {activeTab === "notices" ? (
          <>
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Notices Awaiting Service</span>
                <span className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.pendingNotices}</div>
              <p className="mt-1 text-[11px] text-slate-500">Ready to deliver to winning supplier</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Formally Served</span>
                <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.servedNotices}</div>
              <p className="mt-1 text-[11px] text-slate-500">Delivered and logged</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">POs Awaiting Release</span>
                <span className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.pendingPos}</div>
              <p className="mt-1 text-[11px] text-slate-500">Approved POs ready for supplier releasing</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Released to Suppliers</span>
                <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.releasedPos}</div>
              <p className="mt-1 text-[11px] text-slate-500">Formally released, delivery monitoring active</p>
            </div>
          </>
        )}
      </div>

      {/* Main Content Tables */}
      {activeTab === "notices" ? (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Letters of Notice (Award / Notice to Proceed)</h3>
              <p className="text-xs text-slate-500">Deliver and document service of Letters of Notice to winning suppliers.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Notice Number</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Type & Subject</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Date Issued</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Service Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {notices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No letters of notice found in the registry.
                    </td>
                  </tr>
                ) : (
                  notices.map((n) => {
                    const isServed = n.status === "served";

                    return (
                      <tr key={n.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {n.noticeNumber}
                        </td>
                        <td className="px-4 py-3 max-w-[260px]">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold mb-1 border-slate-300">
                            {n.noticeType}
                          </Badge>
                          <div className="truncate font-medium text-slate-800 dark:text-slate-200" title={n.subject}>
                            {n.subject}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {n.issuedAt ? new Date(n.issuedAt).toLocaleDateString("en-PH") : new Date(n.createdAt).toLocaleDateString("en-PH")}
                        </td>
                        <td className="px-4 py-3">
                          {isServed ? (
                            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px]">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Served to Supplier
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
                              <Clock className="mr-1 h-3 w-3" /> Awaiting Service
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/print/notice?noticeNumber=${n.noticeNumber}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <Printer className="h-3 w-3" />
                                Print
                              </Button>
                            </Link>
                            {isServed ? (
                              <Link href="/purchase-orders">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs border-[#7b1e1e] text-[#7b1e1e] hover:bg-[#fffaf0]"
                                  title="Letter served by PO. Procurement Staff can now prepare the Purchase Order"
                                >
                                  Prepare PO (Staff) →
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleOpenServeNotice(n)}
                                className="h-7 text-xs bg-[#881337] hover:bg-[#70102e] text-white"
                              >
                                <Send className="mr-1 h-3 w-3" />
                                Serve Notice
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Purchase Order Releasing Table */
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Purchase Order / Contract Releasing</h3>
              <p className="text-xs text-slate-500">Formally release approved and signed Purchase Orders / Contracts to awarded suppliers.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">PO Number & Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Awarded Supplier</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">PR Reference</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Total Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Release Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {poItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No Purchase Orders found in the releasing queue.
                    </td>
                  </tr>
                ) : (
                  poItems.map((item) => {
                    const po = item.order;
                    const isReleased = item.isReleased;
                    const isReadyForRelease = po.status === "approved";

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {po.poNumber}
                          <div className="text-[11px] text-slate-500 font-normal">
                            {new Date(po.createdAt).toLocaleDateString("en-PH")}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {item.supplier?.companyName || "Supplier #" + po.supplierId}
                          </div>
                          {item.supplier?.contactPerson && (
                            <div className="text-[11px] text-slate-500">{item.supplier.contactPerson}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {item.purchaseRequest?.prNumber || "PR #" + po.purchaseRequestId}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {formatMoney(po.totalAmount)}
                        </td>
                        <td className="px-4 py-3">
                          {isReleased ? (
                            <div>
                              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px]">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Released to Supplier
                              </Badge>
                              {item.releaseDetails?.releasedAt && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {new Date(item.releaseDetails.releasedAt).toLocaleDateString("en-PH")} via {item.releaseDetails.releaseMode?.replace("_", " ")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
                              <Clock className="mr-1 h-3 w-3" />
                              {isReadyForRelease ? "Ready for Releasing" : "Awaiting Contract Signatures"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            disabled={isReleased || !isReadyForRelease}
                            onClick={() => handleOpenReleasePo(item)}
                            className={`h-7 text-xs ${
                              isReleased
                                ? "bg-slate-100 text-slate-400 dark:bg-slate-800"
                                : "bg-[#881337] hover:bg-[#70102e] text-white"
                            }`}
                          >
                            <FileCheck2 className="mr-1 h-3 w-3" />
                            {isReleased ? "Released" : isReadyForRelease ? "Release to Supplier" : "Awaiting Signatures"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Serve Notice Modal */}
      {selectedNoticeForServe && (
        <Dialog open={Boolean(selectedNoticeForServe)} onOpenChange={(open) => !open && setSelectedNoticeForServe(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Serve Letter of Notice to Supplier
              </DialogTitle>
              <DialogDescription className="text-xs">
                Notice: {selectedNoticeForServe.noticeNumber} · {selectedNoticeForServe.subject}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recipient Name / Supplier Representative: <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={noticeRecipient}
                  onChange={(e) => setNoticeRecipient(e.target.value)}
                  placeholder="Full name of recipient"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date Served:</Label>
                <Input
                  type="date"
                  value={noticeServeDate}
                  onChange={(e) => setNoticeServeDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Delivery Mode:</Label>
                <select
                  value={noticeDeliveryMode}
                  onChange={(e) => setNoticeDeliveryMode(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="hand_delivery">Hand Delivery / Personal Service</option>
                  <option value="courier">Courier Service</option>
                  <option value="registered_mail">Registered Mail</option>
                  <option value="electronic_mail">Electronic Mail (Email)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Remarks / Proof Details:</Label>
                <Textarea
                  value={noticeRemarks}
                  onChange={(e) => setNoticeRemarks(e.target.value)}
                  placeholder="Receiving copy details, tracking number, or transmittal notes..."
                  className="mt-1 text-xs min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedNoticeForServe(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={serveNoticeMutation.isPending || !noticeRecipient.trim()}
                onClick={handleConfirmServeNotice}
                className="text-xs bg-[#881337] hover:bg-[#70102e] text-white"
              >
                {serveNoticeMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm Service
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Release PO Modal */}
      {selectedPoForRelease && (
        <Dialog open={Boolean(selectedPoForRelease)} onOpenChange={(open) => !open && setSelectedPoForRelease(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Release Purchase Order to Supplier
              </DialogTitle>
              <DialogDescription className="text-xs">
                PO: {selectedPoForRelease.order.poNumber} · Supplier: {selectedPoForRelease.supplier?.companyName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recipient Name / Representative: <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={poRecipient}
                  onChange={(e) => setPoRecipient(e.target.value)}
                  placeholder="Full name of receiving person"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Formal Release Date:</Label>
                <Input
                  type="date"
                  value={poReleaseDate}
                  onChange={(e) => setPoReleaseDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Release Mode:</Label>
                <select
                  value={poReleaseMode}
                  onChange={(e) => setPoReleaseMode(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="in_person_pickup">In-Person Pickup / Counter Release</option>
                  <option value="courier">Courier Transmittal</option>
                  <option value="electronic_mail">Official Email Transmittal</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Acknowledgement Receipt Reference (Optional):
                </Label>
                <Input
                  value={poAckReference}
                  onChange={(e) => setPoAckReference(e.target.value)}
                  placeholder="e.g. Signed receiving copy # AR-2026-081"
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Remarks:</Label>
                <Textarea
                  value={poRemarks}
                  onChange={(e) => setPoRemarks(e.target.value)}
                  placeholder="Additional releasing instructions or notes..."
                  className="mt-1 text-xs min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedPoForRelease(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={releasePoMutation.isPending || !poRecipient.trim()}
                onClick={handleConfirmReleasePo}
                className="text-xs bg-[#881337] hover:bg-[#70102e] text-white"
              >
                {releasePoMutation.isPending && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm PO Release
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
