import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { trackSession } from "@/lib/session-tracker";

/**
 * Get the current authenticated user or redirect to sign in.
 * Use in server components / server actions inside protected routes.
 */
export async function requireUser() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/signin");
  }
  
  // Track this login/session activity
  await trackSession(session.user.id);
  
  return session.user as { id: string; email: string; name?: string | null };
}