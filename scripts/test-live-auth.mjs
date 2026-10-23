import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing Supabase URL or Anon key");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function test() {
  console.log("Signing in to Supabase with enduser.demo@bsc.edu.ph...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "enduser.demo@bsc.edu.ph",
    password: "Password123!",
  });

  if (error || !data.session) {
    console.error("Supabase sign-in failed:", error?.message);
    return;
  }

  const token = data.session.access_token;
  console.log("Supabase sign-in succeeded! User ID:", data.user.id);
  console.log("Token length:", token.length);

  console.log("\nSending authenticated request to https://procurewise-ruddy.vercel.app/api/trpc/auth.me...");
  const res = await fetch("https://procurewise-ruddy.vercel.app/api/trpc/auth.me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("Response status:", res.status, res.statusText);
  const body = await res.text();
  console.log("Response body:", body);
}

test();
