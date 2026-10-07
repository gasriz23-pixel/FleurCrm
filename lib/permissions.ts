import { getSessionUser } from "./auth";
import type { UserRole } from "@prisma/client";

export type AppArea = "CRM" | "SEARCH" | "ENRICHMENT" | "TASKS" | "MARKETING" | "BACKOFFICE" | "USERS";

const FULL_ACCESS: UserRole[] = ["ADMIN", "COMMERCIAL"];

export function canAccess(role: UserRole, area: AppArea) {
  if (FULL_ACCESS.includes(role)) return true;
  return area === "TASKS" || area === "BACKOFFICE";
}

export async function requireUser(roles?: UserRole[]) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (roles?.length && !roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function requireArea(area: AppArea) {
  const user = await requireUser();
  if (!canAccess(user.role, area)) throw new Error("FORBIDDEN");
  return user;
}
