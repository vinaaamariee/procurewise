import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tfswokhkuxwvpcpxekso.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

export const isSupabaseConfigured = Boolean(
  (import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL) &&
    (import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
);

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
