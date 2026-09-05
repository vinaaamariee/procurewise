import { useAuth } from "@/_core/hooks/useAuth";
import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseAuth } from "@/lib/supabaseAuth";
import { ArrowLeft, ArrowRight, BadgeCheck, ClipboardList, LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type AccessMode = "sign-in" | "register";

export default function Access() {
  const { user, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const requestedMode = new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "sign-in";
  const [mode, setMode] = useState<AccessMode>(requestedMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setMode(requestedMode); }, [requestedMode]);
  useEffect(() => { if (user) setLocation("/dashboard"); }, [setLocation, user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "sign-in") {
        const { error } = await supabaseAuth.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        try {
          const refreshed = await refresh();
          if (!refreshed.data) {
            throw new Error("Your Supabase sign-in succeeded, but ProcureWise could not load your workspace profile. Please contact an administrator or verify the production database configuration.");
          }
        } catch (err) {
          // auth.me threw (e.g. DB unavailability) — surface the message directly.
          throw err instanceof Error ? err : new Error("Your Supabase sign-in succeeded, but ProcureWise could not load your workspace profile. Please contact an administrator or verify the production database configuration.");
        }
        setLocation("/dashboard");
        return;
      }
      const { data, error } = await supabaseAuth.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/access` },
      });
      if (error) throw error;
      if (!data.session) {
        toast.success("Check your email to confirm the new account, then sign in.");
        setMode("sign-in");
        return;
      }
      const refreshed = await refresh();
      if (!refreshed.data) {
        throw new Error("Your account was created, but ProcureWise could not load your workspace profile. Please sign in again after the account is provisioned.");
      }
      setLocation("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication could not be completed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const registration = mode === "register";
  return <div className="min-h-screen bg-[#f8f7f3] text-[#202833]">
    <header className="border-b border-[#e4e1da] bg-white"><div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8"><Link href="/"><ProcureWiseLogo /></Link><Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#5b6572] hover:text-[#7b1e1e]"><ArrowLeft className="h-3.5 w-3.5" />Return to public site</Link></div></header>
    <main className="flat-grid min-h-[calc(100vh-64px)] border-b border-[#e4e1da]"><div className="mx-auto grid max-w-[1120px] gap-10 px-5 py-12 sm:px-8 lg:min-h-[calc(100vh-64px)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-16"><section className="max-w-xl"><div className="inline-flex items-center gap-2 rounded-[4px] border border-[#e8d8b5] bg-[#fffaf0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6520]"><ShieldCheck className="h-3 w-3" />Authorized procurement access</div><h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#202833] sm:text-5xl">A clear entry point for every procurement role.</h1><p className="mt-6 text-[15px] leading-7 text-[#5f6977]">Sign in to your assigned workspace or create an End-User profile before preparing a PPMP, Purchase Request, and Pre-Canvass package. Elevated procurement roles remain under administrator control.</p><div className="mt-9 grid gap-px overflow-hidden border border-[#e4e1da] bg-[#e4e1da] sm:grid-cols-2"><div className="bg-white p-5"><ClipboardList className="h-5 w-5 text-[#7b1e1e]" /><p className="mt-4 text-sm font-semibold text-[#303946]">Start with your procurement package</p><p className="mt-2 text-[11px] leading-5 text-[#697482]">New End-Users submit PPMP, PR, and three Pre-Canvass supplier quotes for Procurement Officer review.</p></div><div className="bg-white p-5"><BadgeCheck className="h-5 w-5 text-[#7b1e1e]" /><p className="mt-4 text-sm font-semibold text-[#303946]">Role-gated by design</p><p className="mt-2 text-[11px] leading-5 text-[#697482]">Procurement Officer, Administrative Approver, and Admin permissions are assigned only by an administrator.</p></div></div></section>
      <section className="border border-[#ddd7c9] bg-white p-5 shadow-[14px_14px_0_#eee8da] sm:p-6"><div className="flex border-b border-[#ece8df]"><button type="button" onClick={() => setMode("sign-in")} className={`flex-1 border-b-2 px-2 pb-3 text-xs font-semibold ${!registration ? "border-[#7b1e1e] text-[#7b1e1e]" : "border-transparent text-[#77818d]"}`}>Sign in</button><button type="button" onClick={() => setMode("register")} className={`flex-1 border-b-2 px-2 pb-3 text-xs font-semibold ${registration ? "border-[#7b1e1e] text-[#7b1e1e]" : "border-transparent text-[#77818d]"}`}>Create End-User account</button></div><form onSubmit={submit} className="pt-7"><div className="grid h-10 w-10 place-items-center rounded-[5px] border border-[#e5e0d7] bg-[#fbfaf7] text-[#7b1e1e]">{registration ? <UserPlus className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6d19]">{registration ? "First-time access" : "Welcome back"}</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-[#1f2937]">{registration ? "Create your End-User account" : "Access your workspace"}</h2><p className="mt-3 text-sm leading-6 text-[#677281]">{registration ? "Use your work email and a strong password. New profiles begin as End-Users; an administrator assigns elevated roles when authorised." : "Use the email and password registered for your ProcureWise account."}</p><div className="mt-6 grid gap-4">{registration && <div><Label htmlFor="access-name" className="text-xs font-semibold">Full name</Label><Input id="access-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required className="mt-1.5 h-10" autoComplete="name" /></div>}<div><Label htmlFor="access-email" className="text-xs font-semibold">Work email</Label><Input id="access-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 h-10" autoComplete="email" /></div><div><Label htmlFor="access-password" className="text-xs font-semibold">Password</Label><Input id="access-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="mt-1.5 h-10" autoComplete={registration ? "new-password" : "current-password"} /></div></div><Button type="submit" disabled={loading || isSubmitting} className="mt-7 h-10 w-full rounded-[4px] bg-[#7b1e1e] text-sm font-semibold hover:bg-[#641818]">{(loading || isSubmitting) ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : registration ? <UserPlus className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{registration ? "Create End-User account" : "Sign in securely"}<ArrowRight className="ml-2 h-4 w-4" /></Button></form><p className="mt-6 border-t border-[#ece8df] pt-4 text-center text-[11px] leading-5 text-[#77818d]">Authentication is handled by Supabase Auth. ProcureWise stores only the role-gated profile data needed for procurement workflow controls.</p></section>
    </div></main>
  </div>;
}
