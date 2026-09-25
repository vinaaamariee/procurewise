import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { GlobalAppearanceControls } from "@/components/GlobalAppearanceControls";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BadgeCheck, BarChart3, ClipboardList, FileCheck2, FileSearch, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "wouter";

const steps = [
  { number: "01", title: "PPMP, PR & Pre-Canvass", description: "End-Users submit the planned item, Purchase Request, and three supplier quotes together." },
  { number: "02", title: "Procurement Review", description: "The Procurement Officer reviews the package and prepares the Abstract of Canvass." },
  { number: "03", title: "Administrative Approval", description: "The recommended lowest compliant supplier is approved or rejected." },
  { number: "04", title: "PO, Delivery & PMR", description: "The Procurement Officer issues the PO, records delivery, and logs the PMR." },
];

const features = [
  { icon: ClipboardList, title: "Role-gated workflow", description: "Each action is presented only to the authorised government procurement role." },
  { icon: WalletCards, title: "Office-level budget control", description: "Track allotments by office and object of expenditure before commitments are made." },
  { icon: FileSearch, title: "Three-quotation canvas", description: "Structure RFQ canvassing, comparison, compliance, and quotation abstracts." },
  { icon: BarChart3, title: "Procurement intelligence", description: "Monitor cycle time, budget variance, commodities, and plan-versus-actual progress." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#202833] dark:bg-[#11161b] dark:text-[#f1f5f8]">
      <header className="border-b border-[#e4e1da] bg-white dark:border-[#46515c] dark:bg-[#1b2229]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <ProcureWiseLogo />
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden text-xs font-semibold text-[#5b6572] hover:text-[#7b1e1e] sm:inline dark:text-[#aeb9c4] dark:hover:text-white">Workspace</Link>
            <GlobalAppearanceControls />
            <Button asChild className="h-9 rounded-[4px] bg-[#7b1e1e] px-4 text-xs font-semibold text-white hover:bg-[#641818] dark:bg-[#8f2424] dark:hover:bg-[#741c1c]"><Link href="/access">Sign in</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="flat-grid overflow-hidden border-b border-[#e4e1da] dark:border-[#46515c]">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-18 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[4px] border border-[#e8d8b5] bg-[#fffaf0] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8a6520] dark:border-[#735824] dark:bg-[#251e13] dark:text-[#f0c36a]">
                <Landmark className="h-3.5 w-3.5" /> Batanes State College Procurement Office
              </div>
              <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#202833] dark:text-[#f1f5f8] sm:text-5xl lg:text-6xl">Procurement with a clear line of accountability.</h1>
              <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#5f6977] dark:text-[#aeb9c4]">ProcureWise helps Philippine government offices manage the full PR-to-PO lifecycle with disciplined workflow gates, budget visibility, supplier comparison, and traceable decisions.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-10 rounded-[4px] bg-[#7b1e1e] px-5 text-sm font-semibold text-white hover:bg-[#641818] dark:bg-[#8f2424] dark:hover:bg-[#741c1c]"><Link href="/access">Open procurement workspace <ArrowRight className="ml-2 h-4 w-4 text-white" /></Link></Button>
                <Link href="#workflow" className="inline-flex h-10 items-center justify-center rounded-[4px] border border-[#d6d2c9] bg-white px-5 text-sm font-semibold text-[#3d4754] hover:bg-[#fbfaf7] dark:border-[#46515c] dark:bg-[#232c35] dark:text-[#f1f5f8] dark:hover:bg-[#2d3844]">Explore the workflow</Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[#667180] dark:text-[#aeb9c4]">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#7b1e1e] dark:text-[#ff837a]" /> Role-sensitive controls</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-[#7b1e1e] dark:text-[#ff837a]" /> Audit-ready records</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[470px] border border-[#ddd7c9] bg-white p-4 shadow-[14px_14px_0_#eee8da] dark:border-[#46515c] dark:bg-[#1b2229] dark:shadow-[14px_14px_0_#0b0e12]">
              <div className="flex items-center justify-between border-b border-[#ebe7df] pb-3 dark:border-[#3d4854]">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a6d19] dark:text-[#f0c36a]">Procurement pipeline</p><p className="mt-1 text-sm font-semibold text-[#293340] dark:text-[#f1f5f8]">Controlled from request to order</p></div>
                <StatusBadge tone="active">LIVE WORKFLOW</StatusBadge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {steps.map((step, index) => (
                  <div key={step.number} className={`border p-3 ${index === 0 ? "border-[#d9bd7f] bg-[#fffbf1] dark:border-[#735824] dark:bg-[#251e13]" : "border-[#e8e4dc] bg-[#fcfbf8] dark:border-[#384350] dark:bg-[#232c35]"}`}>
                    <p className="text-xs font-bold tracking-[0.16em] text-[#9a6d19] dark:text-[#f0c36a]">{step.number}</p>
                    <p className="mt-4 text-xs font-semibold text-[#303946] dark:text-[#f1f5f8]">{step.title}</p>
                    <p className="mt-1.5 text-xs leading-4 text-[#71808e] dark:text-[#aeb9c4]">{index === 0 ? "Budget check and routing" : "Controlled workflow stage"}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border border-[#e8e4dc] bg-[#fdfcf9] px-3 py-2.5 dark:border-[#384350] dark:bg-[#232c35]"><span className="text-xs text-[#697482] dark:text-[#aeb9c4]">Access is limited to authorised roles</span><ShieldCheck className="h-4 w-4 text-[#7b1e1e] dark:text-[#ff837a]" /></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-18 sm:px-8 lg:py-22">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6d19] dark:text-[#f0c36a]">Built for the public service</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-[#202833] dark:text-[#f1f5f8]">The operational controls procurement teams need.</h2></div>
          <div className="mt-10 grid gap-px overflow-hidden border border-[#e4e1da] bg-[#e4e1da] md:grid-cols-2 dark:border-[#46515c] dark:bg-[#46515c]">
            {features.map((feature) => <div key={feature.title} className="bg-white p-6 dark:bg-[#1b2229]"><feature.icon className="h-5 w-5 text-[#7b1e1e] dark:text-[#ff837a]" /><h3 className="mt-5 text-sm font-semibold text-[#303946] dark:text-[#f1f5f8]">{feature.title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#697482] dark:text-[#aeb9c4]">{feature.description}</p></div>)}
          </div>
        </section>

        <section id="workflow" className="border-y border-[#e4e1da] bg-white dark:border-[#46515c] dark:bg-[#1b2229]">
          <div className="mx-auto max-w-[1280px] px-5 py-18 sm:px-8 lg:py-22"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6d19] dark:text-[#f0c36a]">The standard path</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-[#202833] dark:text-[#f1f5f8]">Every decision moves through a visible, role-gated sequence.</h2></div><Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-[#7b1e1e] hover:underline dark:text-[#ff837a]">View your workspace <ArrowRight className="h-3.5 w-3.5" /></Link></div>
            <div className="mt-10 grid gap-5 lg:grid-cols-4">{steps.map((step, index) => <div key={step.number} className="relative border-l-2 border-[#d3b66e] pl-5 pb-2 lg:border-l-0 lg:border-t-2 lg:pl-0 lg:pt-5"><p className="text-xs font-bold tracking-[0.16em] text-[#9a6d19] dark:text-[#f0c36a]">{step.number}</p><h3 className="mt-2 text-sm font-semibold text-[#303946] dark:text-[#f1f5f8]">{step.title}</h3><p className="mt-2 text-[13px] leading-6 text-[#697482] dark:text-[#aeb9c4]">{step.description}</p>{index < 3 && <ArrowRight className="absolute -right-3 top-4 hidden h-4 w-4 text-[#c7bfae] lg:block dark:text-[#7d8894]" />}</div>)}</div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-8 text-xs text-[#7c8793] dark:text-[#9eaab6] sm:flex-row sm:items-center sm:justify-between sm:px-8"><ProcureWiseLogo compact /><p>Government procurement management for Batanes State College.</p></footer>
    </div>
  );
}
