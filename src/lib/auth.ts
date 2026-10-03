import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./session";

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Dipakai di halaman/aksi server yang wajib login */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
