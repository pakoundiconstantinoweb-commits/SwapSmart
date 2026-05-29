import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase non configuré : définis VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (voir .env.example)."
  );
}

export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});