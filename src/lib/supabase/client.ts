import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour le navigateur (Client Components).
 * Utilise la clé publiable — sûre à exposer, la sécurité est assurée par RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
