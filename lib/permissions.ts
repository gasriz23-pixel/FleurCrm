import { getSessionUser } from "./auth";
import type { UserRole } from "@prisma/client";

export async function requireUser(roles?: UserRole[]){
  const user=await getSessionUser();
  if(!user) throw new Error("UNAUTHENTICATED");
  if(roles?.length && !roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
