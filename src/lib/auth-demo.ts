import "server-only";
import { cookies } from "next/headers";
import { isDemoEmail, isDemoEnabled } from "./demo";

export async function isDemoRequest() {
  if (!isDemoEnabled()) return false;
  const email = (await cookies()).get("demo_user_email")?.value;
  return !!email && isDemoEmail(email);
}
