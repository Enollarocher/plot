import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Applique le middleware à tout sauf les fichiers statiques et images
     * pour éviter de rafraîchir la session inutilement sur ces requêtes.
     */
    "/((?!_next/static|_next/image|favicon.ico|logo-plot.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
