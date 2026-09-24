import { useAuth } from "@/_core/hooks/useAuth";
import { ProcureWiseLogo } from "@/components/ProcureWiseLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseAuth } from "@/lib/supabaseAuth";
import { ArrowLeft, ArrowRight, BadgeCheck, ClipboardList, Eye, EyeOff, LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => { setMode(requestedMode); }, [requestedMode]);
  useEffect(() => { if (user) setLocation("/dashboard"); }, [setLocation, user]);

  const emailError = touched.email && (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))
    ? "Enter a valid work email address."
    : "";
  const passwordError = touched.password && password.length < 6
    ? "Password must contain at least 6 characters."
    : "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 6) return;
    setIsSubmitting(true);
    try {
      if (mode === "sign-in") {
        const { error } = await supabaseAuth.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const refreshed = await refresh();
        if (!refreshed.data) {
          throw new Error("Your Supabase sign-in succeeded, but ProcureWise could not load your workspace profile. Please contact an administrator or verify the production database configuration.");
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
      const message = error instanceof TypeError && error.message.toLowerCase().includes("fetch")
        ? "Unable to reach Supabase Auth. Check your internet connection and confirm that the deployed Vercel environment has the correct Supabase URL."
        : error instanceof Error ? error.message : "Authentication could not be completed.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const recoverPassword = async () => {
    setTouched((current) => ({ ...current, email: true }));
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Enter your email address first so Supabase can send the recovery link.");
      return;
    }
    setIsRecovering(true);
    try {
      const { error } = await supabaseAuth.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/access?mode=reset`,
      });
      if (error) throw error;
      toast.success("Password recovery email sent. Check your inbox for the reset link.");
    } catch (error) {
      const message = error instanceof TypeError && error.message.toLowerCase().includes("fetch")
        ? "Unable to reach Supabase Auth. Check your connection and try again."
        : error instanceof Error ? error.message : "Password recovery could not be completed.";
      toast.error(message);
    } finally {
      setIsRecovering(false);
    }
  };

  const registration = mode === "register";
  return <div className="min-h-screen bg-[#f8f7f3] text-[#202833]">
    <header className="border-b border-[#e4e1da] bg-white"><div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8"><Link href="/"><ProcureWiseLogo /></Link><Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#5b6572] hover:text-[#7b1e1e]"><ArrowLeft className="h-3.5 w-3.5" />Return to public site</Link></div></header>
    <main className="flat-grid min-h-[calc(100vh-64px)] border-b border-[#e4e1da]"><div className="mx-auto grid max-w-[1120px] gap-10 px-5 py-12 sm:px-8 lg:min-h-[calc(100vh-64px)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-16"><section className="max-w-xl"><div className="inline-flex items-center gap-2 rounded-[4px] border border-[#e8d8b5] bg-[#fffaf0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6520]"><ShieldCheck className="h-3 w-3" />Authorized procurement access</div><h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#202833] sm:text-5xl">A clear entry point for every procurement role.</h1><p className="mt-6 text-[15px] leading-7 text-[#5f6977]">Sign in to your assigned workspace or create an End-User profile before preparing a PPMP, Purchase Request, and preliminary quotation package. Elevated procurement roles remain under administrator control.</p><div className="mt-9 grid gap-px overflow-hidden border border-[#e4e1da] bg-[#e4e1da] sm:grid-cols-2"><div className="bg-white p-5"><ClipboardList className="h-5 w-5 text-[#7b1e1e]" /><p className="mt-4 text-sm font-semibold text-[#303946]">Start with your procurement package</p><p className="mt-2 text-[11px] leading-5 text-[#697482]">New End-Users submit the PR, PPMP, and preliminary quotations from the completed pre-canvass for Procurement Staff/BAC validation.</p></div><div className="bg-white p-5"><BadgeCheck className="h-5 w-5 text-[#7b1e1e]" /><p className="mt-4 text-sm font-semibold text-[#303946]">Role-gated by design</p><p className="mt-2 text-[11px] leading-5 text-[#697482]">Procurement Officer I/II, Procurement Staff, BAC, HoPE, Budget Officer, and Admin permissions are assigned only by an administrator.</p></div></div></section>
      <section className="border border-[#ddd7c9] bg-white p-5 shadow-[14px_14px_0_#eee8da] sm:p-6"><div className="flex border-b border-[#ece8df]"><button type="button" onClick={() => setMode("sign-in")} className={`flex-1 border-b-2 px-2 pb-3 text-xs font-semibold ${!registration ? "border-[#7b1e1e] text-[#7b1e1e]" : "border-transparent text-[#77818d]"}`}>Sign in</button><button type="button" onClick={() => setMode("register")} className={`flex-1 border-b-2 px-2 pb-3 text-xs font-semibold ${registration ? "border-[#7b1e1e] text-[#7b1e1e]" : "border-transparent text-[#77818d]"}`}>Create End-User account</button></div><form onSubmit={submit} className="pt-7"><div className="grid h-10 w-10 place-items-center rounded-[5px] border border-[#e5e0d7] bg-[#fbfaf7] text-[#7b1e1e]">{registration ? <UserPlus className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6d19]">{registration ? "First-time access" : "Welcome back"}</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-[#1f2937]">{registration ? "Create your End-User account" : "Access your workspace"}</h2><p className="mt-3 text-sm leading-6 text-[#677281]">{registration ? "Use your work email and a strong password. New profiles begin as End-Users; an administrator assigns elevated roles when authorised." : "Use the email and password registered for your ProcureWise account."}</p><div className="mt-6 grid gap-4">{registration && <div><Label htmlFor="access-name" className="text-xs font-semibold">Full name</Label><Input id="access-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required className="mt-1.5 h-10" autoComplete="name" /></div>}<div><Label htmlFor="access-email" className="text-xs font-semibold">Work email</Label><Input id="access-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, email: true }))} required className={`mt-1.5 h-10 ${emailError ? "border-red-500 focus-visible:ring-red-500" : ""}`} autoComplete="email" aria-invalid={Boolean(emailError)} aria-describedby={emailError ? "access-email-error" : undefined} />{emailError && <p id="access-email-error" className="mt-1 text-xs text-red-600">{emailError}</p>}</div><div><Label htmlFor="access-password" className="text-xs font-semibold">Password</Label><div className="relative mt-1.5"><Input id="access-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, password: true }))} required minLength={6} className={`h-10 pr-10 ${passwordError ? "border-red-500 focus-visible:ring-red-500" : ""}`} autoComplete={registration ? "new-password" : "current-password"} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? "access-password-error" : undefined} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#697482] hover:bg-[#f2f0eb] hover:text-[#7b1e1e]" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{passwordError && <p id="access-password-error" className="mt-1 text-xs text-red-600">{passwordError}</p>}</div></div><Button type="submit" disabled={loading || isSubmitting || isRecovering} className="mt-7 h-10 w-full rounded-[4px] bg-[#7b1e1e] text-sm font-semibold hover:bg-[#641818]">{(loading || isSubmitting) ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : registration ? <UserPlus className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{isSubmitting ? "Signing in…" : registration ? "Create End-User account" : "Sign in securely"}<ArrowRight className="ml-2 h-4 w-4" /></Button>{!registration && <button type="button" onClick={recoverPassword} disabled={isRecovering || isSubmitting} className="mt-4 flex w-full items-center justify-center text-xs font-semibold text-[#7b1e1e] hover:underline">{isRecovering && <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />}Forgot password?</button>}</form><p className="mt-6 border-t border-[#ece8df] pt-4 text-center text-[11px] leading-5 text-[#77818d]">Authentication is handled by Supabase Auth. ProcureWise stores only the role-gated profile data needed for procurement workflow controls.</p></section>
    </div></main>
  </div>;
}
