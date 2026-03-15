import type { Session } from "next-auth";
import { auth } from "@/auth";

export function getAdminSessionEmail(
  session: Session | null | undefined
): string | null {
  const actor = (session as Session & {
    actor?: { email?: string | null };
  } | null | undefined)?.actor;

  return actor?.email || session?.user?.email || null;
}

export function isAdminSession(
  session: Session | null | undefined
): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const sessionEmail = getAdminSessionEmail(session);

  return Boolean(adminEmail && sessionEmail && sessionEmail === adminEmail);
}

export async function isAdmin(): Promise<boolean> {
  return isAdminSession(await auth());
}

export async function requireAdmin() {
  const session = await auth();
  if (!isAdminSession(session)) {
    throw new Error("Unauthorized");
  }

  return session;
}
