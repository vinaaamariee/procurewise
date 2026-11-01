import React from "react";
import { ScrollText, FileSignature, Info, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PurchaseOrderItem {
  no?: string | number;
  stockPropertyNo?: string;
  unit: string;
  description: string;
  quantity: number | string;
  estimatedUnitCost: number | string;
  totalCost: number | string;
}

export interface OfficialPurchaseOrderProps {
  entityName?: string;
  poNumber?: string;
  poDate?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierTin?: string;
  modeOfProcurement?: string;
  placeOfDelivery?: string;
  dateOfDelivery?: string;
  deliveryTerm?: string;
  paymentTerm?: string;
  items?: PurchaseOrderItem[];
  purpose?: string;
  totalAmount?: number | string;
  amountInWords?: string;
  authorizedOfficialName?: string;
  authorizedOfficialDesignation?: string;
  conformeSupplierName?: string;
  conformeDate?: string;
  fundCluster?: string;
  orsBursNumber?: string;
  orsBursDate?: string;
  fundsAvailable?: number | string;
  chiefAccountantName?: string;
  chiefAccountantTitle?: string;
  refNumber?: string;
  editable?: boolean;
  showInstructions?: boolean;
  onFieldChange?: (field: string, value: any) => void;
}

export function amountToWords(num: number | string): string {
  const n = Number(num);
  if (isNaN(n) || n <= 0) return "ZERO PESOS ONLY";

  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
  const teens = ["TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function convertGroup(val: number): string {
    let result = "";
    if (val >= 100) {
      result += ones[Math.floor(val / 100)] + " HUNDRED ";
      val %= 100;
    }
    if (val >= 20) {
      result += tens[Math.floor(val / 10)] + " ";
      val %= 10;
    } else if (val >= 10) {
      result += teens[val - 10] + " ";
      val = 0;
    }
    if (val > 0) {
      result += ones[val] + " ";
    }
    return result.trim();
  }

  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);

  const billions = Math.floor(integerPart / 1_000_000_000);
  const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1000);
  const remainder = integerPart % 1000;

  let words = "";
  if (billions > 0) words += convertGroup(billions) + " BILLION ";
  if (millions > 0) words += convertGroup(millions) + " MILLION ";
  if (thousands > 0) words += convertGroup(thousands) + " THOUSAND ";
  if (remainder > 0) words += convertGroup(remainder) + " ";

  words = words.trim() + " PESOS";
  if (decimalPart > 0) {
    words += ` AND ${decimalPart}/100`;
  } else {
    words += " ONLY";
  }

  return words.replace(/\s+/g, " ").trim();
}

export function OfficialPurchaseOrderCanvas({
  entityName = "BATANES STATE COLLEGE",
  poNumber = "2025-01-036",
  poDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  supplierName = "J&J Office Supplies",
  supplierAddress = "Basco, Batanes",
  supplierTin = "183-008-448",
  modeOfProcurement = "Small Value Procurement",
  placeOfDelivery = "Batanes State College",
  dateOfDelivery = "30 days upon receipt of PO",
  deliveryTerm = "FOB Destination",
  paymentTerm = "15 days upon complete delivery",
  items = [
    { no: "001", unit: "unit", description: "Printer ink & test booklet paper", quantity: 50, estimatedUnitCost: 500, totalCost: 25000 },
    { no: "002", unit: "pack", description: "Specialty cover boards & bindings", quantity: 100, estimatedUnitCost: 481.30, totalCost: 48130 },
  ],
  purpose = "for the program/activity of (IGP-Printing) supplies for IGP Printing Services (Testbooklet) to be charged to Fund 165",
  totalAmount,
  amountInWords,
  authorizedOfficialName = "DJOVI REGALA DURANTE",
  authorizedOfficialDesignation = "SUC President I",
  conformeSupplierName = "",
  conformeDate = "",
  fundCluster = "Fund 165",
  orsBursNumber = "2026-01-0089",
  orsBursDate = "",
  fundsAvailable,
  chiefAccountantName = "RHEA ANGELLICA B. ADDATU, CPA",
  chiefAccountantTitle = "Accountant I",
  refNumber = "2601-GAS2-009",
  editable = false,
  showInstructions = true,
  onFieldChange,
}: OfficialPurchaseOrderProps) {
  const calculatedTotal = items.reduce(
    (acc, it) => acc + (Number(it.totalCost) || Number(it.quantity) * Number(it.estimatedUnitCost) || 0),
    0
  );
  const finalTotal = totalAmount !== undefined ? Number(totalAmount) : calculatedTotal;
  const finalWords = amountInWords || amountToWords(finalTotal);

  // Minimum 8 rows for official Appendix 61 layout
  const rowsToRender = [...items];
  while (rowsToRender.length < 8) {
    rowsToRender.push({
      no: String(rowsToRender.length + 1).padStart(3, "0"),
      unit: "-",
      description: "-",
      quantity: 0,
      estimatedUnitCost: 0,
      totalCost: 0,
    });
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Live Appendix 61 Document Paper */}
      <div className="w-full max-w-[850px] mx-auto bg-white border border-stone-300 shadow-md p-4 sm:p-8 font-serif text-[11px] leading-tight text-neutral-900 select-text overflow-hidden box-border">
        {/* Top Header */}
        <div className="relative text-center border-b border-stone-800 pb-3 mb-3 w-full min-w-0">
          <div className="absolute right-0 top-0 text-[10px] font-sans font-medium text-neutral-600 italic">
            Appendix 61
          </div>
          <h1 className="font-bold text-base tracking-wider uppercase font-sans">PURCHASE ORDER</h1>
          <h2 className="font-bold text-sm tracking-wide mt-0.5">{entityName}</h2>
          <p className="text-[10px] text-neutral-600 italic">(Agency)</p>
        </div>

        {/* PO Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border border-stone-800 text-[10.5px] w-full min-w-0">
          {/* Left Metadata */}
          <div className="p-2 border-b sm:border-b-0 sm:border-r border-stone-800 space-y-1 min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-20 sm:w-24 font-bold font-sans shrink-0">Supplier:</span>
              <span className="flex-1 font-semibold min-w-0 break-words">{supplierName || "—"}</span>
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-20 sm:w-24 font-bold font-sans shrink-0">Address:</span>
              <span className="flex-1 min-w-0 break-words">{supplierAddress || "—"}</span>
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-20 sm:w-24 font-bold font-sans shrink-0">TIN:</span>
              <span className="flex-1 font-mono min-w-0 break-words">{supplierTin || "—"}</span>
            </div>
          </div>

          {/* Right Metadata */}
          <div className="p-2 space-y-1 min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-24 sm:w-32 font-bold font-sans shrink-0">PO No.:</span>
              <span className="flex-1 font-bold font-mono text-[#7b1e1e] min-w-0 break-words">{poNumber}</span>
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-24 sm:w-32 font-bold font-sans shrink-0">Date:</span>
              <span className="flex-1 min-w-0 break-words">{poDate}</span>
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-24 sm:w-32 font-bold font-sans shrink-0">Mode of Procurement:</span>
              <span className="flex-1 font-medium min-w-0 break-words">{modeOfProcurement}</span>
            </div>
          </div>
        </div>

        {/* Instruction Subheader */}
        <div className="border-x border-b border-stone-800 px-3 py-1.5 text-[10px] italic text-neutral-700 bg-neutral-50/50 w-full min-w-0">
          Please furnish this office the following articles subject to the terms and conditions contained herein:
        </div>

        {/* Delivery Terms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border-x border-b border-stone-800 text-[10.5px] w-full min-w-0">
          <div className="p-2 border-b sm:border-b-0 sm:border-r border-stone-800 space-y-1 min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-28 sm:w-32 font-bold font-sans shrink-0">Place of Delivery:</span>
              <span className="flex-1 min-w-0 break-words">{placeOfDelivery}</span>
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-28 sm:w-32 font-bold font-sans shrink-0">Date of Delivery:</span>
              <span className="flex-1 min-w-0 break-words">{dateOfDelivery}</span>
            </div>
          </div>
          <div className="p-2 space-y-1 min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-28 sm:w-32 font-bold font-sans shrink-0">Delivery Term:</span>
              <span className="flex-1 font-semibold min-w-0 break-words">{deliveryTerm}</span>
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="w-28 sm:w-32 font-bold font-sans shrink-0">Payment Term:</span>
              <span className="flex-1 min-w-0 break-words">{paymentTerm}</span>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="border-x border-b border-stone-800 overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-stone-100/80 border-b border-stone-800 font-sans font-bold text-center">
                <th className="py-1.5 px-2 border-r border-stone-800 w-12">No.</th>
                <th className="py-1.5 px-2 border-r border-stone-800 w-16">Unit</th>
                <th className="py-1.5 px-3 border-r border-stone-800 text-left">Description</th>
                <th className="py-1.5 px-2 border-r border-stone-800 w-14">Qty</th>
                <th className="py-1.5 px-2 border-r border-stone-800 w-24">Unit Cost</th>
                <th className="py-1.5 px-2 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rowsToRender.map((it, idx) => {
                const isRealItem = Number(it.totalCost) > 0 || it.description !== "-";
                return (
                  <tr key={idx} className="border-b border-stone-300 last:border-b-0">
                    <td className="py-1 px-2 text-center border-r border-stone-800 font-mono text-[9.5px]">
                      {it.no || String(idx + 1).padStart(3, "0")}
                    </td>
                    <td className="py-1 px-2 text-center border-r border-stone-800">
                      {isRealItem ? it.unit : "—"}
                    </td>
                    <td className="py-1 px-3 border-r border-stone-800 text-left font-sans">
                      {isRealItem ? (
                        <>
                          <span className="font-medium text-stone-900">{it.description}</span>
                          {it.stockPropertyNo && (
                            <span className="block text-[8.5px] text-stone-500 font-mono">
                              Prop #{it.stockPropertyNo}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-1 px-2 text-center border-r border-stone-800 font-mono">
                      {isRealItem ? it.quantity : "—"}
                    </td>
                    <td className="py-1 px-2 text-right border-r border-stone-800 font-mono">
                      {isRealItem ? `₱${Number(it.estimatedUnitCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-medium">
                      {isRealItem ? `₱${Number(it.totalCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/* Total Row */}
              <tr className="border-t-2 border-stone-800 bg-stone-50 font-sans font-bold">
                <td colSpan={2} className="py-2 px-3 text-center border-r border-stone-800 text-xs">
                  TOTAL
                </td>
                <td colSpan={3} className="py-2 px-3 border-r border-stone-800 text-[10px] uppercase text-[#7b1e1e]">
                  **{finalWords}**
                </td>
                <td className="py-2 px-3 text-right font-mono text-xs text-[#7b1e1e]">
                  ₱{finalTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Purpose Box */}
        <div className="border-x border-b border-stone-800 p-2 text-[10px]">
          <span className="font-bold font-sans">Purpose: </span>
          <span className="italic text-stone-800">{purpose}</span>
        </div>

        {/* Penalty Clause */}
        <div className="border-x border-b border-stone-800 p-2.5 text-[9.5px] text-justify leading-relaxed text-stone-700 bg-stone-50/30">
          In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for everyday of delay shall be imposed.
        </div>

        {/* Signatures Conforme & Authorized Official */}
        <div className="grid grid-cols-2 border-x border-b border-stone-800 text-[10.5px]">
          {/* Conforme (Supplier) */}
          <div className="p-3 border-r border-stone-800 flex flex-col justify-between min-h-[90px]">
            <div>
              <p className="font-bold font-sans text-[10px]">Conforme:</p>
            </div>
            <div className="pt-8 text-center">
              <div className="border-b border-stone-700 mx-auto w-48 mb-1">
                <span className="font-semibold text-[10px]">{conformeSupplierName || ""}</span>
              </div>
              <p className="text-[9px] text-stone-600">(Signature over printed name)</p>
              <div className="mt-2 text-left text-[9.5px]">
                <span className="font-sans font-medium">Date: </span>
                <span className="border-b border-stone-500 inline-block w-28 text-center">{conformeDate || "____________________"}</span>
              </div>
            </div>
          </div>

          {/* Very Truly Yours (HoPE) */}
          <div className="p-3 flex flex-col justify-between min-h-[90px]">
            <div>
              <p className="font-bold font-sans text-[10px] text-right">Very truly yours,</p>
            </div>
            <div className="pt-8 text-center">
              <div className="border-b border-stone-700 mx-auto w-52 mb-1">
                <span className="font-bold text-[11px] font-sans text-[#7b1e1e] uppercase">
                  {authorizedOfficialName}
                </span>
              </div>
              <p className="font-semibold text-[10px] text-stone-700">{authorizedOfficialDesignation}</p>
            </div>
          </div>
        </div>

        {/* Accounting & ORS/BURS Certification Box */}
        <div className="border-x border-b border-stone-800 p-3 text-[10px] space-y-2 bg-stone-50/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-28 font-bold font-sans">Funds Cluster:</span>
                <span className="flex-1 font-mono font-semibold">{fundCluster}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold font-sans">Funds Available:</span>
                <span className="flex-1 font-mono font-semibold">
                  ₱{(fundsAvailable ? Number(fundsAvailable) : finalTotal).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 font-bold font-sans">ORS/BURS No.:</span>
                <span className="flex-1 font-mono font-semibold text-amber-900">{orsBursNumber || "—"}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold font-sans">Date of the ORS/BURS:</span>
                <span className="flex-1 font-mono">{orsBursDate || poDate}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold font-sans">Amount:</span>
                <span className="flex-1 font-mono font-semibold">
                  ₱{finalTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 grid grid-cols-2 items-end">
            <div className="text-center w-60">
              <div className="border-b border-stone-700 mb-1">
                <span className="font-bold font-sans text-[10.5px] uppercase">{chiefAccountantName}</span>
              </div>
              <p className="text-[9px] text-stone-700 font-sans">{chiefAccountantTitle}</p>
            </div>

            <div className="text-right text-[9px] text-stone-600 font-sans space-y-0.5">
              <p className="italic">Note: See PO instructions at the back</p>
              <p className="font-semibold text-stone-800">
                Ref. No.: <span className="font-mono text-[#7b1e1e]">{refNumber}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Official Instructions Section (Appendix 61 Accomplishment Guidelines) */}
      {showInstructions && (
        <div className="w-full max-w-[850px] mx-auto bg-stone-50 dark:bg-[#141b22] border border-stone-200 dark:border-[#2b3744] rounded-lg p-5 text-neutral-700 dark:text-[#a5b4c4] text-xs shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-200 border-b border-stone-200 dark:border-stone-700 pb-2">
            <Info className="h-4 w-4 text-[#7b1e1e]" />
            <span>Official Government Accounting Manual (GAM) Appendix 61 Instructions</span>
          </div>

          <div className="space-y-2 text-[11px] leading-relaxed">
            <p>
              <strong>A. Purpose of Form:</strong> The Purchase Order (PO) is a form/document used by the agency/entity, addressed to supplier, to deliver specific quantities of supplies/goods/property subject to the terms and conditions contained in the PO.
            </p>
            <p className="font-semibold text-stone-800 dark:text-stone-200">B. This form shall be accomplished as follows:</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-2 text-neutral-600 dark:text-neutral-400">
              <li>
                <strong>Entity Name:</strong> Name of the agency/entity (<span className="font-mono">Batanes State College</span>).
              </li>
              <li>
                <strong>P.O. No.:</strong> The number assigned to the PO formatted as <span className="font-mono bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded">0000-00-0000</span> (Year-Month-Serial number for each fiscal year).
              </li>
              <li>
                <strong>Date:</strong> Date of preparation of the PO by the <strong>Procurement Staff</strong>.
              </li>
              <li>
                <strong>Mode of Procurement:</strong> e.g., Small Value Procurement (Sec. 53.9), Public Bidding, Shopping, Direct Contracting in accordance with RA 9184 / RA 12009.
              </li>
              <li>
                <strong>Place/Date of Delivery:</strong> Definite delivery location and schedule (defaults to 7 or 30 calendar days upon receipt of PO).
              </li>
              <li>
                <strong>Delivery Term:</strong> e.g., FOB Destination, FOB Shipping Point.
              </li>
              <li>
                <strong>Payment Term:</strong> Specified period (e.g., 15 days upon complete delivery & inspection, 2/10 n/30).
              </li>
              <li>
                <strong>Stock/Property No., Unit, Description, Qty, Cost:</strong> Line item specifications declared in the RFQ and Abstract of Quotations.
              </li>
              <li>
                <strong>Total Amount in Words:</strong> Full written currency expression in Philippine Pesos followed by ONLY.
              </li>
              <li>
                <strong>Signatories:</strong> Conforme (Supplier), Authorized Official / HoPE (SUC President I), and Chief Accountant / Budget Officer (Funds Clearance).
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
