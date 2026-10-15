import React, { useEffect, useState } from "react";
import { ScrollText, FileSignature, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BacSignatory {
  name: string;
  designation: string;
  role: string;
}

export type BacResolutionDocType = "resolution" | "hope_approval" | "both";

export interface OfficialBacResolutionProps {
  documentType?: BacResolutionDocType;
  resolutionNumber?: string;
  prNumber?: string;
  purposeOrItems?: string;
  approvedBudget?: number | string;
  modeOfProcurement?: string;
  evaluationMode?: "lot_basis" | "per_item";
  dateResolved?: string;
  dateApproved?: string;
  entityName?: string;
  collegePresidentName?: string;
  collegePresidentDesignation?: string;
  bacMembers?: BacSignatory[];
  endUserName?: string;
  endUserDesignation?: string;
  editable?: boolean;
  onFieldChange?: (field: string, value: any) => void;
  onDocumentTypeChange?: (type: BacResolutionDocType) => void;
}

export const DEFAULT_BSC_BAC_MEMBERS: BacSignatory[] = [
  { name: "RHOUPHELINE AYA A. CADIZ", designation: "Instructor I", role: "BAC Member" },
  { name: "FORTUNATO PHILIP A. CABUGAO", designation: "Assistant Professor II", role: "BAC Member" },
  { name: "EMILYN D. ALUETA", designation: "Administrative Officer IV", role: "BAC Member" },
  { name: "MARIE FE E. PABLEO", designation: "End-User / Project In-Charge", role: "End-User/Provisional Member" },
  { name: "PHILIP ULYSSES T. CASTILLO", designation: "Associate Professor II", role: "BAC Vice Chairperson" },
  { name: "DOREEN C. CASTILLO", designation: "Chief Administrative Officer", role: "BAC Chairperson" },
];

export function OfficialBacResolutionCanvas({
  documentType = "resolution",
  resolutionNumber = "2601-GAS2-009",
  prNumber = "2026-009",
  purposeOrItems = "AM snacks (Burger and Canned Juice/Soda), Packed Meals (Pork,Chicken,Veggie,Rice,Dessert,and Drinking Water),and PM Snacks (Special spaghetti and Canned Juice/ Soda)--Snacks and meals for the evaluation and interview of applicants for private sector representative (PSR).",
  approvedBudget = 53600,
  modeOfProcurement = "Small Value Procurement",
  evaluationMode = "lot_basis",
  dateResolved,
  dateApproved,
  entityName = "Batanes State College",
  collegePresidentName = "DJOVI REGALA DURANTE, DPA",
  collegePresidentDesignation = "SUC President I",
  bacMembers = DEFAULT_BSC_BAC_MEMBERS,
  endUserName,
  editable = true,
  onFieldChange,
  onDocumentTypeChange,
}: OfficialBacResolutionProps) {
  // Document Type state ("resolution" | "hope_approval" | "both")
  const [activeDocType, setActiveDocType] = useState<BacResolutionDocType>(documentType || "resolution");

  // Local editable states initialized from props
  const [localEntityName, setLocalEntityName] = useState(entityName);
  const [localResolutionNumber, setLocalResolutionNumber] = useState(resolutionNumber);
  const [localPrNumber, setLocalPrNumber] = useState(prNumber);
  const [localPurposeOrItems, setLocalPurposeOrItems] = useState(purposeOrItems);
  const [localApprovedBudget, setLocalApprovedBudget] = useState(approvedBudget);
  const [localModeOfProcurement, setLocalModeOfProcurement] = useState(modeOfProcurement);
  const [localEvaluationMode, setLocalEvaluationMode] = useState(evaluationMode);
  const [localDateResolved, setLocalDateResolved] = useState(
    dateResolved || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  );
  const [localDateApproved, setLocalDateApproved] = useState(dateApproved || "___________________");
  const [localPresidentName, setLocalPresidentName] = useState(collegePresidentName);
  const [localPresidentDesignation, setLocalPresidentDesignation] = useState(collegePresidentDesignation);
  const [localMembers, setLocalMembers] = useState<BacSignatory[]>(bacMembers);

  // Sync props to state if props update from outside
  useEffect(() => {
    if (documentType) setActiveDocType(documentType);
  }, [documentType]);
  useEffect(() => { setLocalEntityName(entityName); }, [entityName]);
  useEffect(() => { setLocalResolutionNumber(resolutionNumber); }, [resolutionNumber]);
  useEffect(() => { setLocalPrNumber(prNumber); }, [prNumber]);
  useEffect(() => { setLocalPurposeOrItems(purposeOrItems); }, [purposeOrItems]);
  useEffect(() => { setLocalApprovedBudget(approvedBudget); }, [approvedBudget]);
  useEffect(() => { setLocalModeOfProcurement(modeOfProcurement); }, [modeOfProcurement]);
  useEffect(() => { setLocalEvaluationMode(evaluationMode); }, [evaluationMode]);
  useEffect(() => { setLocalPresidentName(collegePresidentName); }, [collegePresidentName]);
  useEffect(() => { setLocalPresidentDesignation(collegePresidentDesignation); }, [collegePresidentDesignation]);
  useEffect(() => {
    let updated = [...bacMembers];
    if (endUserName) {
      updated = updated.map((m) =>
        m.role.includes("End-User") ? { ...m, name: endUserName } : m
      );
    }
    setLocalMembers(updated);
  }, [bacMembers, endUserName]);

  const handleDocTypeChange = (type: BacResolutionDocType) => {
    setActiveDocType(type);
    onDocumentTypeChange?.(type);
    onFieldChange?.("documentType", type);
  };

  const formattedBudget = typeof localApprovedBudget === "number"
    ? localApprovedBudget.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(localApprovedBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const editableClass = editable
    ? "cursor-text hover:bg-amber-50/70 focus:bg-amber-50 focus:ring-1 focus:ring-[#7b1e1e] focus:outline-none rounded px-0.5 transition-colors print:bg-transparent print:ring-0 print:px-0"
    : "";

  const handleMemberChange = (index: number, field: keyof BacSignatory, val: string) => {
    const updated = [...localMembers];
    updated[index] = { ...updated[index], [field]: val };
    setLocalMembers(updated);
    onFieldChange?.("bacMembers", updated);
  };

  const row1 = localMembers.slice(0, 3);
  const row2 = localMembers.slice(3, 6);

  // Common Header
  const renderHeader = (title: string) => (
    <div className="text-center space-y-1 pb-4">
      <p
        className={`text-[11px] font-sans font-semibold tracking-wider uppercase text-neutral-600 ${editableClass}`}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) => onFieldChange?.("country", e.currentTarget.innerText)}
      >
        Republic of the Philippines
      </p>
      <p
        className={`text-sm font-bold tracking-wide uppercase ${editableClass}`}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) => {
          const val = e.currentTarget.innerText.trim();
          setLocalEntityName(val);
          onFieldChange?.("entityName", val);
        }}
      >
        {localEntityName}
      </p>
      <p
        className={`text-xs font-semibold uppercase tracking-wider text-[#7b1e1e] ${editableClass}`}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) => onFieldChange?.("office", e.currentTarget.innerText)}
      >
        BIDS AND AWARDS COMMITTEE OFFICE
      </p>

      <div className="pt-3">
        <h2
          className={`text-sm sm:text-base font-bold uppercase underline tracking-tight ${editableClass}`}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={(e) => {
            const val = e.currentTarget.innerText.trim();
            onFieldChange?.("title", val);
          }}
        >
          {title}
        </h2>
        <p className="mt-1 text-xs font-bold font-mono">
          BAC Resolution No.{" "}
          <span
            className={`underline ml-1 font-bold ${editableClass}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => {
              const val = e.currentTarget.innerText.trim();
              setLocalResolutionNumber(val);
              onFieldChange?.("resolutionNumber", val);
            }}
          >
            {localResolutionNumber}
          </span>
        </p>
      </div>
    </div>
  );

  // Common Recitals (WHEREAS clauses)
  const renderRecitals = () => (
    <div className="mt-4 space-y-3.5 text-justify text-[11.5px] leading-[1.6]">
      <p className={editableClass} contentEditable={editable} suppressContentEditableWarning>
        <span className="font-bold tracking-wide">WHEREAS</span>, Section 48 Rule XVI of the Revised Implementing Rules and Regulations of RA 9184 allows Alternative Mode of Procurement subject to prior approval of the HOPE thru Annual Procurement Plan (APP) and only to promote economy and efficiency;
      </p>

      <p className={editableClass} contentEditable={editable} suppressContentEditableWarning>
        <span className="font-bold tracking-wide">WHEREAS</span>, Section 53.9 allows Small Value Procurement provided that the procurement does not fall under shopping in Section 52 of this IRR and the amount involved does not exceed the thresholds prescribed in Annex &ldquo;H&rdquo; of this IRR;
      </p>

      <p className={editableClass} contentEditable={editable} suppressContentEditableWarning>
        <span className="font-bold tracking-wide">WHEREAS</span>, Section 5.7.1 of the procurement rules provides that after the deadline for submission of quotations, the same shall be forwarded to the BAC Chairperson for opening. An Abstract of Quotations/Canvass/Ratings shall be prepared, setting forth the names of those who responded to the RFQ and their corresponding price quotations;
      </p>

      <p className={editableClass} contentEditable={editable} suppressContentEditableWarning>
        <span className="font-bold tracking-wide">WHEREAS</span>, Annex &ldquo;H&rdquo; of the Consolidated Guidelines for the Alternative Methods of Procurement prescribed under Section V, Paragraph D.8.b.ii that the BAC shall prepare and send the RFQs/RFPs to at least three (3) suppliers, contractors or consultants of known qualifications where receipt of at least one (1) quotation is sufficient to proceed with the evaluation thereof;
      </p>

      <div className="pl-4 border-l-2 border-[#7b1e1e]/40 py-1 space-y-1.5 my-2">
        <p>
          <span className="font-bold tracking-wide">WHEREAS</span>, Purchase Request No.{" "}
          <span
            className={`font-bold font-mono underline ${editableClass}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => {
              const val = e.currentTarget.innerText.trim();
              setLocalPrNumber(val);
              onFieldChange?.("prNumber", val);
            }}
          >
            {localPrNumber}
          </span>{" "}
          involves the procurement of:
        </p>
        <p
          className={`italic font-sans text-[11px] bg-neutral-50 p-2 rounded border border-neutral-200 text-neutral-800 ${editableClass}`}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={(e) => {
            const val = e.currentTarget.innerText.trim();
            setLocalPurposeOrItems(val);
            onFieldChange?.("purposeOrItems", val);
          }}
        >
          &ldquo;{localPurposeOrItems}&rdquo;
        </p>
        <p>
          with the approved budget of{" "}
          <span className="font-bold underline">
            PhP{" "}
            <span
              className={editableClass}
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={(e) => {
                const raw = e.currentTarget.innerText.replace(/[^0.0-9.]/g, "");
                const num = Number(raw) || 0;
                setLocalApprovedBudget(num);
                onFieldChange?.("approvedBudget", num);
              }}
            >
              {formattedBudget}
            </span>
          </span>;
        </p>
      </div>

      <p className={editableClass} contentEditable={editable} suppressContentEditableWarning>
        <span className="font-bold tracking-wide">WHEREAS</span>, the default mode of evaluation shall be on a{" "}
        <span className="font-semibold underline">
          {localEvaluationMode === "lot_basis" ? "lot basis" : "per item basis"}
        </span>{" "}
        which means that the determination of the Single or Lowest Calculated and Responsive Quotation (S/LCRQ) is the total amount of offered unit price multiplied by the required quantity;
      </p>
    </div>
  );

  // Render Document 1: BAC Resolution
  const renderBacResolution = () => (
    <div className="resolution-document-page">
      {renderHeader(`BAC Resolution Recommending Alternative Mode of Procurement under ${localModeOfProcurement}`)}

      {renderRecitals()}

      {/* NOW THEREFORE for BAC Resolution */}
      <div className="mt-4 space-y-3.5 text-justify text-[11.5px] leading-[1.6]">
        <p className={`pt-1 ${editableClass}`} contentEditable={editable} suppressContentEditableWarning>
          <span className="font-bold tracking-wide">NOW THEREFORE</span>, we, the members of the Bids and Awards Committee hereby <span className="font-bold">RESOLVE</span> as it is hereby <span className="font-bold">RESOLVED</span> to recommend to the College President to adopt Alternative Mode of Procurement under <span className="font-bold underline">{localModeOfProcurement}</span> for the said transaction;
        </p>

        <p className="pt-1 font-semibold">
          RESOLVED FINALLY, at the {localEntityName}, this{" "}
          <span
            className={`underline ${editableClass}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => {
              const val = e.currentTarget.innerText.trim();
              setLocalDateResolved(val);
              onFieldChange?.("dateResolved", val);
            }}
          >
            {localDateResolved}
          </span>.
        </p>
      </div>

      {/* Signatories Section: 6 BAC Members */}
      <div className="mt-8 pt-4 border-t border-neutral-300">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-6">
          Recommending Approval:
        </p>

        {/* Row 1: 3 BAC Members */}
        <div className="grid grid-cols-3 gap-6 text-center">
          {row1.map((member, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-full border-b border-black pb-1">
                <span
                  className={`font-bold text-[11px] uppercase tracking-tight block ${editableClass}`}
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => handleMemberChange(i, "name", e.currentTarget.innerText.trim())}
                >
                  {member.name}
                </span>
              </div>
              <span
                className={`text-[10px] text-neutral-700 block mt-1 font-semibold ${editableClass}`}
                contentEditable={editable}
                suppressContentEditableWarning
                onBlur={(e) => handleMemberChange(i, "role", e.currentTarget.innerText.trim())}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>

        {/* Row 2: End-User, Vice Chair, Chair */}
        <div className="grid grid-cols-3 gap-6 text-center mt-8">
          {row2.map((member, i) => {
            const actualIndex = i + 3;
            return (
              <div key={actualIndex} className="flex flex-col items-center">
                <div className="w-full border-b border-black pb-1">
                  <span
                    className={`font-bold text-[11px] uppercase tracking-tight block ${editableClass}`}
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleMemberChange(actualIndex, "name", e.currentTarget.innerText.trim())}
                  >
                    {member.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] text-neutral-700 block mt-1 font-semibold ${editableClass}`}
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => handleMemberChange(actualIndex, "role", e.currentTarget.innerText.trim())}
                >
                  {member.role}
                </span>
              </div>
            );
          })}
        </div>

        {/* Approved by Section (HoPE) */}
        <div className="mt-10 pt-4 flex flex-col items-center sm:items-start">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-6">
            Approved:
          </p>
          <div className="text-center min-w-[260px]">
            <div className="border-b border-black pb-1">
              <span
                className={`font-bold text-xs uppercase tracking-tight block ${editableClass}`}
                contentEditable={editable}
                suppressContentEditableWarning
                onBlur={(e) => {
                  const val = e.currentTarget.innerText.trim();
                  setLocalPresidentName(val);
                  onFieldChange?.("collegePresidentName", val);
                }}
              >
                {localPresidentName}
              </span>
            </div>
            <span
              className={`text-[10.5px] text-neutral-700 block mt-1 font-semibold ${editableClass}`}
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={(e) => {
                const val = e.currentTarget.innerText.trim();
                setLocalPresidentDesignation(val);
                onFieldChange?.("collegePresidentDesignation", val);
              }}
            >
              {localPresidentDesignation}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Document 2: Letter of Approval of HoPE (Approval of BAC Resolution)
  const renderHopeApproval = () => (
    <div className="hope-approval-document-page">
      {renderHeader(`Approval of BAC Resolution Recommending Alternative Mode of Procurement under ${localModeOfProcurement}`)}

      {renderRecitals()}

      {/* NOW THEREFORE for HoPE Approval */}
      <div className="mt-4 space-y-3.5 text-justify text-[11.5px] leading-[1.6]">
        <p className={`pt-1 ${editableClass}`} contentEditable={editable} suppressContentEditableWarning>
          <span className="font-bold tracking-wide">NOW THEREFORE</span>, I,{" "}
          <span
            className={`font-bold ${editableClass}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => {
              const val = e.currentTarget.innerText.trim();
              setLocalPresidentName(val);
              onFieldChange?.("collegePresidentName", val);
            }}
          >
            {localPresidentName}
          </span>{" "}
          Head of the Procuring Entity (HOPE) by virtue of the authority vested in me by the Board of Trustees of this Institution and after taking into consideration the merits and legal bases of the recommendation of the members of the Bids and Awards Committee (BAC) do hereby <span className="font-bold">APPROVE</span> the foregoing recommendation and adoption of Alternative Mode of Procurement under <span className="font-bold underline">{localModeOfProcurement}</span>;
        </p>

        <p className="pt-2 font-semibold">
          APPROVED FINALLY, at the {localEntityName}, this{" "}
          <span
            className={`underline ${editableClass}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => {
              const val = e.currentTarget.innerText.trim();
              setLocalDateApproved(val);
              onFieldChange?.("dateApproved", val);
            }}
          >
            {localDateApproved}
          </span>
        </p>
      </div>

      {/* Single Prominent HoPE Signatory */}
      <div className="mt-16 pt-4 flex flex-col items-start">
        <div className="text-center min-w-[280px]">
          <div className="border-b border-black pb-1">
            <span
              className={`font-bold text-xs uppercase tracking-wide block ${editableClass}`}
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={(e) => {
                const val = e.currentTarget.innerText.trim();
                setLocalPresidentName(val);
                onFieldChange?.("collegePresidentName", val);
              }}
            >
              {localPresidentName}
            </span>
          </div>
          <span
            className={`text-[11px] text-neutral-800 block mt-1 font-semibold ${editableClass}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => {
              const val = e.currentTarget.innerText.trim();
              setLocalPresidentDesignation(val);
              onFieldChange?.("collegePresidentDesignation", val);
            }}
          >
            {localPresidentDesignation}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <article
      aria-label="Official BAC Resolution and HoPE Approval Canvas"
      className="official-bac-resolution bg-white text-black p-6 sm:p-10 font-serif leading-relaxed text-xs shadow-sm border border-[#d8d3c5] max-w-[850px] mx-auto print:border-0 print:shadow-none print:p-0 print:m-0 relative"
    >
      {/* Visual edit mode and document switcher banner (Hidden during print) */}
      <div className="no-print mb-6 space-y-2 select-none print:hidden">
        {/* Document Selection Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f6f2e9] p-1.5 border border-[#e8ded0]">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => handleDocTypeChange("resolution")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer font-sans",
                activeDocType === "resolution"
                  ? "bg-white text-[#7b1e1e] shadow-sm font-bold"
                  : "text-neutral-600 hover:text-black hover:bg-white/50"
              )}
            >
              <ScrollText className="h-3.5 w-3.5 shrink-0" />
              1. BAC Resolution (Recommendation)
            </button>

            <button
              type="button"
              onClick={() => handleDocTypeChange("hope_approval")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer font-sans",
                activeDocType === "hope_approval"
                  ? "bg-white text-[#7b1e1e] shadow-sm font-bold"
                  : "text-neutral-600 hover:text-black hover:bg-white/50"
              )}
            >
              <FileSignature className="h-3.5 w-3.5 shrink-0" />
              2. Letter of Approval of HoPE
            </button>

            <button
              type="button"
              onClick={() => handleDocTypeChange("both")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer font-sans",
                activeDocType === "both"
                  ? "bg-white text-[#7b1e1e] shadow-sm font-bold"
                  : "text-neutral-600 hover:text-black hover:bg-white/50"
              )}
            >
              <Layers className="h-3.5 w-3.5 shrink-0" />
              Complete Package (Both)
            </button>
          </div>

          <span className="text-[10px] text-neutral-500 font-sans px-2">
            Active:{" "}
            <span className="font-bold text-[#7b1e1e]">
              {activeDocType === "resolution"
                ? "BAC Resolution"
                : activeDocType === "hope_approval"
                ? "Letter of Approval of HoPE"
                : "Both Documents"}
            </span>
          </span>
        </div>

        {/* Live editing indicator */}
        {editable && (
          <div className="flex items-center justify-between rounded bg-[#faf5ec] border border-[#ecdcc0] px-3 py-1.5 text-[11px] text-[#805719]">
            <span className="flex items-center gap-1.5 font-sans font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Editable Document Canvas: Click on any text, clause, ABC amount, or signatory to edit directly.
            </span>
            <span className="text-[10px] text-neutral-500 font-sans">Edits reflect on print</span>
          </div>
        )}
      </div>

      {/* Main Document Content */}
      {activeDocType === "resolution" && renderBacResolution()}

      {activeDocType === "hope_approval" && renderHopeApproval()}

      {activeDocType === "both" && (
        <div className="space-y-12">
          {renderBacResolution()}

          {/* Page Break for Print and Clean Visual Separator for Screen */}
          <div className="relative my-10 print:break-before-page border-t-2 border-dashed border-neutral-300 print:border-none pt-8">
            <span className="no-print absolute left-1/2 -top-3 -translate-x-1/2 bg-white px-3 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
              Page 2 · Letter of Approval of HoPE
            </span>
          </div>

          {renderHopeApproval()}
        </div>
      )}
    </article>
  );
}
