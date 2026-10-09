import type { AppRole, SessionProfile } from "@/types";

// UI hints only; RLS is the real check.
export const hasAnyRole = (me: SessionProfile, roles: AppRole[]) => me.roles.some((r) => roles.includes(r));
export const canRecordPayments = (me: SessionProfile) => hasAnyRole(me, ["owner", "finance"]);
