import { useAuth } from "@/_core/hooks/useAuth";
import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { ArrowLeft, ArrowRight, BadgeCheck, ClipboardList, LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

type AccessMode = "sign-in" | "register";

export default function Access() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const accessMode = new URLSearchParams(window.location.search).get("mode");
  const requestedMode: AccessMode = accessMode === "register" ? "register" : "sign-in";
  const hasModeLink = accessMode === "sign-in" || accessMode === "register";
  const [mode, setMode] = useState<AccessMode>(requestedMode);

  useEffect(() => {
    setMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (user && !hasModeLink) setLocation("/dashboard");
  }, [hasModeLink, setLocation, user]);

  return <div className="min-h-screen bg-[#f8f7f3] text-[#202833]">
    <header className="border-b border-[#e4e1da] bg-white"><div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8"><Link href="/"><ProcureWiseLogo /></Link><Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#5b6572] hover:text-[#7b1e1e]"><ArrowLeft className="h-3.5 w-3.5" /> Return to public site</Link></div></header>
    <main className="flat-grid min-h-[calc(100vh-64px)] border-b border-[#e4e1da]"><div className="mx-auto grid max-w-[1120px] gap-10 px-5 py-12 sm:px-8 lg:min-h-[calc(100vh-64px)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-16"><section className="max-w-xl"><div className="inline-flex items-center gap-2 rounded-[4px] border border-[#e8d8b5] bg-[#fffaf0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6520]"><ShieldCheck className="h-3 w-3" /> Authorized procurement access</div><h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#202833] sm:text-5xl">A clear entry point for every procurement role.</h1><p className="mt-6 text-[15px] leading-7 text-[#5f6977]">Sign in to your assigned workspace or create your End-User profile before preparing a PPMP, Purchase Request, and Pre-Canvass package. Elevated procurement roles remain under administrator control.</p><div className="mt-9 grid gap-px overflow-hidden border border-[#e4e1da] bg-[#e4e1da] sm:grid-cols-2"><div className="bg-white p-5"><ClipboardList className="h-5 w-5 text-[#7b1e1e]" /><p className="mt-4 text-sm font-semibold text-[#303946]">Start with your procurement package</p><p className="mt-2 text-[11px] leading-5 text-[#697482]">New End-Users submit PPMP, PR, and three Pre-Canvass supplier quotes for Procurement Officer review.</p></div><div className="bg-white p-5"><BadgeCheck className="h-5 w-5 text-[#7b1e1e]" /><p className="mt-4 text-sm font-semibold text-[#303946]">Role-gated by design</p><p className="mt-2 text-[11px] leading-5 text-[#697482]">Procurement Officer, Administrative Approver, and Admin permissions are assigned only by an administrator.</p></div></div></section>
      <section className="border border-[#ddd7c9] bg-white p-5 shadow-[14px_14px_0_#eee8da] sm:p-6"><div className="flex border-b border-[#ece8df]"><button type="button" onClick={() => setMode("sign-in")} className={`flex-1 border-b-2 px-2 pb-3 text-xs font-semibold transition-colors ${mode === "sign-in" ? "border-[#7b1e1e] text-[#7b1e1e]" : "border-transparent text-[#77818d] hover:text-[#303946]"}`}>Sign in</button><button type="button" onClick={() => setMode("register")} className={`flex-1 border-b-2 px-2 pb-3 text-xs font-semibold transition-colors ${mode === "register" ? "border-[#7b1e1e] text-[#7b1e1e]" : "border-transparent text-[#77818d] hover:text-[#303946]"}`}>Create End-User account</button></div>
        {mode === "sign-in" ? <div className="pt-7"><div className="grid h-10 w-10 place-items-center rounded-[5px] border border-[#e5e0d7] bg-[#fbfaf7] text-[#7b1e1e]"><ShieldCheck className="h-5 w-5" /></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6d19]">Welcome back</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-[#1f2937]">Access your workspace</h2><p className="mt-3 text-sm leading-6 text-[#677281]">Use your existing secure account to continue to the ProcureWise workspace assigned to your role.</p><Button onClick={() => startLogin()} disabled={loading} className="mt-7 h-10 w-full rounded-[4px] bg-[#7b1e1e] text-sm font-semibold hover:bg-[#641818]">{loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Sign in securely<ArrowRight className="ml-2 h-4 w-4" /></Button></div> : <div className="pt-7"><div className="grid h-10 w-10 place-items-center rounded-[5px] border border-[#e5e0d7] bg-[#fbfaf7] text-[#7b1e1e]"><UserPlus className="h-5 w-5" /></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6d19]">First-time access</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-[#1f2937]">Create your End-User account</h2><p className="mt-3 text-sm leading-6 text-[#677281]">Complete secure sign-in to create your ProcureWise profile. New profiles begin as End-Users and can create Purchase Requests immediately after required office setup is available.</p><div className="mt-5 border border-[#e4d4ae] bg-[#fffaf0] p-4"><p className="text-[11px] font-semibold text-[#8a6520]">What happens next</p><ol className="mt-2 space-y-1.5 text-[11px] leading-5 text-[#75643e]"><li>1. Verify your identity through the secure account portal.</li><li>2. ProcureWise creates your End-User profile on first access.</li><li>3. An administrator assigns any elevated procurement role when authorised.</li></ol></div><Button onClick={() => startLogin()} disabled={loading} className="mt-6 h-10 w-full rounded-[4px] bg-[#7b1e1e] text-sm font-semibold hover:bg-[#641818]">{loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}Create End-User account<ArrowRight className="ml-2 h-4 w-4" /></Button></div>}
        <p className="mt-6 border-t border-[#ece8df] pt-4 text-center text-[11px] leading-5 text-[#77818d]">ProcureWise does not collect or store a separate password. Access is handled through the existing secure account service.</p></section>
    </div></main>
  </div>;
}
