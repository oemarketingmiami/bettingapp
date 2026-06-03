import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client bound to the request cookies (App Router). Used to read the
// signed-in user in server components / route handlers.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          // Setting cookies works in Route Handlers / Server Actions; in a
          // Server Component it throws — the middleware handles refresh there.
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* no-op in Server Components */
          }
        },
      },
    },
  );
}
