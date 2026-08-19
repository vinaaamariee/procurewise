import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BadgeCheck, BarChart3, ClipboardList, FileCheck2, FileSearch, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "wouter";

const steps = [
  { number: "01", title: "Purchase Request", description: "End-Users prepare purpose-led, budget-linked PRs for review." },
  { number: "02", title: "RFQ & Canvass", description: "Supply staff document at least three supplier quotations." },
  { number: "03", title: "BAC Review", description: "The lowest compliant quotation is abstracted for approval." },
  { number: "04", title: "Purchase Order", description: "Approved POs are released with a complete audit trail." },
];

const features = [
  { icon: ClipboardList, title: "Role-gated workflow", description: "Each action is presented only to the authorised government procurement role." },
  { icon: WalletCards, title: "Office-level budget control", description: "Track allotments by office and object of expenditure before commitments are made." },
  { icon: FileSearch, title: "Three-quotation canvas", description: "Structure RFQ canvassing, comparison, compliance, and quotation abstracts." },
  { icon: BarChart3, title: "Procurement intelligence", description: "Monitor cycle time, budget variance, commodities, and plan-versus-actual progress." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#202833]">
      <header className="border-b border-[#e4e1da] bg-white">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <ProcureWiseLogo />
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden text-xs font-semibold text-[#5b6572] hover:text-[#7b1e1e] sm:inline">Workspace</Link>
            <Button asChild className="h-9 rounded-[4px] bg-[#7b1e1e] px-4 text-xs font-semibold hover:bg-[#641818]"><Link href="/access">Sign in</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="flat-grid overflow-hidden border-b border-[#e4e1da]">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-18 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[4px] border border-[#e8d8b5] bg-[#fffaf0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6520]">
                <Landmark className="h-3 w-3" /> Batanes State College Procurement Office
              </div>
              <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#202833] sm:text-5xl lg:text-6xl">Procurement with a clear line of accountability.</h1>
              <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#5f6977]">ProcureWise helps Philippine government offices manage the full PR-to-PO lifecycle with disciplined workflow gates, budget visibility, supplier comparison, and traceable decisions.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-10 rounded-[4px] bg-[#7b1e1e] px-5 text-sm font-semibold hover:bg-[#641818]"><Link href="/access">Open procurement workspace <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Link href="#workflow" className="inline-flex h-10 items-center justify-center rounded-[4px] border border-[#d6d2c9] bg-white px-5 text-sm font-semibold text-[#3d4754] hover:bg-[#fbfaf7]">Explore the workflow</Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-[11px] font-semibold text-[#667180]">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#7b1e1e]" /> Role-sensitive controls</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-[#7b1e1e]" /> Audit-ready records</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[470px] border border-[#ddd7c9] bg-white p-4 shadow-[14px_14px_0_#eee8da]">
              <div className="flex items-center justify-between border-b border-[#ebe7df] pb-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6d19]">Procurement pipeline</p><p className="mt-1 text-sm font-semibold text-[#293340]">Controlled from request to order</p></div>
                <StatusBadge tone="active">LIVE WORKFLOW</StatusBadge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {steps.map((step, index) => (
                  <div key={step.number} className={`border p-3 ${index === 0 ? "border-[#d9bd7f] bg-[#fffbf1]" : "border-[#e8e4dc] bg-[#fcfbf8]"}`}>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[#9a6d19]">{step.number}</p>
                    <p className="mt-4 text-xs font-semibold text-[#303946]">{step.title}</p>
                    <p className="mt-1.5 text-[11px] leading-4 text-[#718]">{index === 0 ? "Budget check and routing" : "Controlled workflow stage"}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border border-[#e8e4dc] bg-[#fdfcf9] px-3 py-2.5"><span className="text-[11px] text-[#697482]">Access is limited to authorised roles</span><ShieldCheck className="h-4 w-4 text-[#7b1e1e]" /></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-18 sm:px-8 lg:py-22">
          <div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6d19]">Built for the public service</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-[#202833]">The operational controls procurement teams need.</h2></div>
          <div className="mt-10 grid gap-px overflow-hidden border border-[#e4e1da] bg-[#e4e1da] md:grid-cols-2">
            {features.map((feature) => <div key={feature.title} className="bg-white p-6"><feature.icon className="h-5 w-5 text-[#7b1e1e]" /><h3 className="mt-5 text-sm font-semibold text-[#303946]">{feature.title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#697482]">{feature.description}</p></div>)}
          </div>
        </section>

        <section id="workflow" className="border-y border-[#e4e1da] bg-white">
          <div className="mx-auto max-w-[1280px] px-5 py-18 sm:px-8 lg:py-22"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6d19]">The standard path</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-[#202833]">Every decision moves through a visible, role-gated sequence.</h2></div><Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-[#7b1e1e] hover:underline">View your workspace <ArrowRight className="h-3.5 w-3.5" /></Link></div>
            <div className="mt-10 grid gap-5 lg:grid-cols-4">{steps.map((step, index) => <div key={step.number} className="relative border-l-2 border-[#d3b66e] pl-5 pb-2 lg:border-l-0 lg:border-t-2 lg:pl-0 lg:pt-5"><p className="text-[10px] font-bold tracking-[0.16em] text-[#9a6d19]">{step.number}</p><h3 className="mt-2 text-sm font-semibold text-[#303946]">{step.title}</h3><p className="mt-2 text-[13px] leading-6 text-[#697482]">{step.description}</p>{index < 3 && <ArrowRight className="absolute -right-3 top-4 hidden h-4 w-4 text-[#c7bfae] lg:block" />}</div>)}</div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-8 text-[11px] text-[#7c8793] sm:flex-row sm:items-center sm:justify-between sm:px-8"><ProcureWiseLogo compact /><p>Government procurement management for Batanes State College.</p></footer>
    </div>
  );
}
