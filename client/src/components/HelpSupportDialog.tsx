import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  LifeBuoy,
  Mail,
  Phone,
  Scale,
  Send,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

interface HelpSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = "manuals" | "guidelines" | "ticket";

export function HelpSupportDialog({ open, onOpenChange }: HelpSupportDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("manuals");

  // Support ticket form state
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("system");
  const [ticketPriority, setTicketPriority] = useState("normal");
  const [ticketDescription, setTicketDescription] = useState("");
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      toast.error("Please fill in both the subject and inquiry description.");
      return;
    }

    const ticketId = `PW-TICK-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedTicketId(ticketId);
    toast.success(`Support ticket ${ticketId} created successfully! Our PMO team will respond within 24 hours.`);
  };

  const handleResetTicketForm = () => {
    setSubmittedTicketId(null);
    setTicketSubject("");
    setTicketDescription("");
    setTicketCategory("system");
    setTicketPriority("normal");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto border border-border bg-card p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#881337]/10 dark:bg-[#881337]/25 text-[#881337] dark:text-[#fda4af]">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                ProcureWise Help &amp; Support Center
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Procedure manuals, Republic Act 9184 guidelines, and institutional support tickets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mt-2 space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab("manuals")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "manuals"
                ? "border-[#881337] text-[#881337] dark:border-[#fda4af] dark:text-[#fda4af]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>User Manuals</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guidelines")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "guidelines"
                ? "border-[#881337] text-[#881337] dark:border-[#fda4af] dark:text-[#fda4af]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            <span>RA 12009 (NGPA) Guidelines</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ticket")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "ticket"
                ? "border-[#881337] text-[#881337] dark:border-[#fda4af] dark:text-[#fda4af]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            <span>Support Tickets</span>
          </button>
        </div>

        {/* TAB 1: USER MANUALS */}
        {activeTab === "manuals" && (
          <div className="mt-4 space-y-4 text-xs text-foreground">
            {/* Section 5.1.1 Quick Reference */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <h4 className="font-bold text-amber-950 dark:text-amber-200 text-xs">
                  Section 5.1.1 Category Segregation Rule
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                The Procurement Officer verifies specifications to ensure items are strictly segregated into distinct requests across the 5 mandated commodity groups:
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 pt-1 text-[11px]">
                <span className="rounded bg-amber-100/80 dark:bg-amber-900/40 px-2 py-1 font-medium text-amber-900 dark:text-amber-300">
                  1. Office Supplies
                </span>
                <span className="rounded bg-amber-100/80 dark:bg-amber-900/40 px-2 py-1 font-medium text-amber-900 dark:text-amber-300">
                  2. Hardware Supplies
                </span>
                <span className="rounded bg-amber-100/80 dark:bg-amber-900/40 px-2 py-1 font-medium text-amber-900 dark:text-amber-300">
                  3. ICT Supplies
                </span>
                <span className="rounded bg-amber-100/80 dark:bg-amber-900/40 px-2 py-1 font-medium text-amber-900 dark:text-amber-300">
                  4. Printing Services
                </span>
                <span className="rounded bg-amber-100/80 dark:bg-amber-900/40 px-2 py-1 font-medium text-amber-900 dark:text-amber-300">
                  5. Food Ingredients
                </span>
              </div>
              <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 italic pt-1">
                Mixed categories must be returned to the End-User for Section 5.1.1 revision prior to PMR recording.
              </p>
            </div>

            {/* Procedure 5 Workflow Duties */}
            <div className="space-y-2">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-slate-500">
                Official Procedure 5 Workflow Stages
              </h4>
              <div className="divide-y divide-border rounded-xl border border-border bg-muted/30 overflow-hidden text-[11px]">
                <div className="p-2.5 flex items-start gap-2">
                  <span className="font-mono font-bold text-[#881337] dark:text-[#fda4af]">5.1</span>
                  <div>
                    <p className="font-semibold text-foreground">End-User PR Preparation &amp; Officer Verification</p>
                    <p className="text-muted-foreground text-[10px]">End-User prepares PR from approved PPMP. Procurement Officer verifies items and category segregation.</p>
                  </div>
                </div>
                <div className="p-2.5 flex items-start gap-2">
                  <span className="font-mono font-bold text-[#881337] dark:text-[#fda4af]">5.2</span>
                  <div>
                    <p className="font-semibold text-foreground">Procurement Staff PMR Recording</p>
                    <p className="text-muted-foreground text-[10px]">Staff logs verified PRs into the Procurement Monitoring Report registry with official tracking numbers.</p>
                  </div>
                </div>
                <div className="p-2.5 flex items-start gap-2">
                  <span className="font-mono font-bold text-[#881337] dark:text-[#fda4af]">5.3</span>
                  <div>
                    <p className="font-semibold text-foreground">RFQ Preparation &amp; Distribution</p>
                    <p className="text-muted-foreground text-[10px]">Staff drafts RFQs; Officer distributes to canvassers/suppliers and transmits quotation packages to BAC.</p>
                  </div>
                </div>
                <div className="p-2.5 flex items-start gap-2">
                  <span className="font-mono font-bold text-[#881337] dark:text-[#fda4af]">5.4</span>
                  <div>
                    <p className="font-semibold text-foreground">PhilGEPS Posting Verification</p>
                    <p className="text-muted-foreground text-[10px]">Officer logs PhilGEPS reference numbers and compliance certificates for mandatory posting periods.</p>
                  </div>
                </div>
                <div className="p-2.5 flex items-start gap-2">
                  <span className="font-mono font-bold text-[#881337] dark:text-[#fda4af]">5.6</span>
                  <div>
                    <p className="font-semibold text-foreground">BAC Abstract of Quotations (AOQ) &amp; Resolution</p>
                    <p className="text-muted-foreground text-[10px]">BAC reviews the Abstract of Quotations and recommends award to the HoPE in favor of the supplier with the Single or Lowest Calculated and Responsive Quotation.</p>
                  </div>
                </div>
                <div className="p-2.5 flex items-start gap-2">
                  <span className="font-mono font-bold text-[#881337] dark:text-[#fda4af]">5.7</span>
                  <div>
                    <p className="font-semibold text-foreground">Purchase Order Drafting, Allotment &amp; Releasing</p>
                    <p className="text-muted-foreground text-[10px]">Staff drafts PO, Budget Officer certifies funds availability, HoPE approves, and Officer serves Notice &amp; releases PO.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RA 12009 (NGPA) GUIDELINES */}
        {activeTab === "guidelines" && (
          <div className="mt-4 space-y-4 text-xs text-foreground">
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <h4 className="font-bold text-blue-950 dark:text-blue-200 text-xs">
                  Republic Act No. 12009 — New Government Procurement Act (NGPA)
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-900/90 dark:text-blue-200/90">
                All procurement activities of Batanes State College strictly adhere to Republic Act No. 12009 (New Government Procurement Act) and its official Implementing Rules and Regulations (IRR), which modernizes Philippine public procurement, introduces fit-for-purpose modalities, and repeals RA 9184.
              </p>
            </div>

            {/* 8 Governing Principles (Article I) */}
            <div className="rounded-xl border border-border p-3.5 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">Article I: 8 Governing Principles (Section 2)</p>
                <span className="text-[10px] rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 px-2 py-0.5 font-medium">Core Mandate</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Public procurement is anchored on eight fundamental principles governing all stages:
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <div className="rounded bg-muted/60 p-1.5"><span className="font-semibold text-foreground">1. Transparency:</span> Electronic PhilGEPS disclosure.</div>
                <div className="rounded bg-muted/60 p-1.5"><span className="font-semibold text-foreground">2. Competitiveness:</span> Equal opportunity for suppliers.</div>
                <div className="rounded bg-muted/60 p-1.5"><span className="font-semibold text-foreground">3. Efficiency:</span> Streamlined process &amp; resource optimization.</div>
                <div className="rounded bg-muted/60 p-1.5"><span className="font-semibold text-foreground">4. Proportionality:</span> Rules scaled to risk and contract value.</div>
                <div className="rounded bg-muted/60 p-1.5"><span className="font-semibold text-foreground">5. Accountability:</span> Strict civil, criminal &amp; admin responsibility.</div>
                <div className="rounded bg-muted/60 p-1.5"><span className="font-semibold text-foreground">6. Participatory:</span> Civic observers &amp; open monitoring.</div>
                <div className="rounded bg-muted/60 p-1.5"><span className="font-semibold text-foreground">7. Sustainability:</span> Green procurement &amp; life-cycle impacts.</div>
                <div className="rounded bg-muted/60 p-1.5"><span className="font-semibold text-foreground">8. Professionalism:</span> Mandatory capability standards.</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border p-3.5 space-y-1.5 bg-card">
                <p className="font-semibold text-foreground">Article II: Strategic Procurement Planning &amp; Market Scoping (Sections 7–19)</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Requires fit-for-purpose planning, early market scoping, and Life-Cycle Cost Analysis (LCCA) prior to PPMP finalization. Procuring entities must align requisitions with verified institutional needs, preventing arbitrary procurement and contract splitting.
                </p>
              </div>

              <div className="rounded-xl border border-border p-3.5 space-y-1.5 bg-card">
                <p className="font-semibold text-foreground">Article III: Procurement by Electronic Means &amp; PhilGEPS (Sections 20–25)</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Institutionalizes PhilGEPS as the single electronic portal tracking everything from planning down to final payment. All Small Value Procurement packages with an ABC exceeding <strong>₱50,000.00</strong> require documented PhilGEPS electronic posting before BAC transmittal.
                </p>
              </div>

              <div className="rounded-xl border border-border p-3.5 space-y-1.5 bg-card">
                <p className="font-semibold text-foreground">Article IV: Modernized Modes of Procurement (Sections 26–38)</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Establishes Competitive Bidding as default, alongside modernized alternative modalities: <strong>Small Value Procurement (SVP)</strong> (validating at least 3 supplier quotations), <strong>Direct Acquisition</strong> for minor purchases, <strong>Competitive Dialogue</strong> for complex technical solutions, and Framework Agreements.
                </p>
              </div>

              <div className="rounded-xl border border-border p-3.5 space-y-1.5 bg-card">
                <p className="font-semibold text-foreground">Article V: Evaluation &amp; Award — MEARB / Best Value (Section 43)</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Formally codifies the <strong>Most Economically Advantageous and Responsive Bid (MEARB)</strong> criterion. ProcureWise implements this statutory standard through its Multi-Criteria Decision Making (MCDM) Best Value Engine, scoring quotes on price (60%), delivery timeline (20%), and statutory compliance (20%).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUPPORT TICKETS */}
        {activeTab === "ticket" && (
          <div className="mt-4 space-y-4 text-xs text-foreground">
            {submittedTicketId ? (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 p-5 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    Support Ticket Logged Successfully
                  </h4>
                  <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                    Your request reference code is{" "}
                    <span className="font-mono font-bold">{submittedTicketId}</span>.
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Our Procurement Management Office and technical helpdesk have received your request. A status update will be sent to your institutional email.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetTicketForm}
                    className="text-xs"
                  >
                    Submit Another Inquiry
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#881337]"
                    >
                      <option value="system">Technical Issue / Bug</option>
                      <option value="section_5_1_1">Section 5.1.1 Category Rule</option>
                      <option value="ra_12009">RA 12009 (NGPA) Compliance Question</option>
                      <option value="access_role">Role Permissions &amp; Office</option>
                      <option value="form_template">Form Template Assistance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#881337]"
                    >
                      <option value="normal">Normal (Routine inquiry)</option>
                      <option value="high">High (Procurement deadline pending)</option>
                      <option value="urgent">Urgent (Workflow blocked)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Subject / Summary
                  </label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="e.g., Question regarding PPMP item threshold or PR revision"
                    className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#881337]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Detailed Description
                  </label>
                  <textarea
                    rows={4}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Describe your issue, affected PR/RFQ reference numbers, or guidance needed..."
                    className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#881337]"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 bg-[#881337] hover:bg-[#70102b] text-white text-xs font-semibold px-4"
                  >
                    <Send className="h-3 w-3 mr-1.5" />
                    Submit Support Ticket
                  </Button>
                </div>
              </form>
            )}

            {/* Institutional Helpdesk Contacts */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 mt-3">
              <h5 className="font-semibold text-foreground text-[11px]">Direct Support Channels</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#881337] dark:text-[#fda4af]" />
                  <span>procurement@bsc.edu.ph</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#881337] dark:text-[#fda4af]" />
                  <span>BSC PMO Office Local 104</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-5 flex items-center justify-between sm:justify-between border-t border-border pt-3">
          <span className="text-[10px] text-muted-foreground">
            ProcureWise · Help &amp; Support strictly decoupled from notification alerts
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close Guide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
