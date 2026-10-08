import { redirect } from "next/navigation";
import { requireUser } from "../../lib/permissions";
import { UserRole } from "@prisma/client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireUser([UserRole.ADMIN]);
  } catch {
    redirect("/dashboard");
  }
  return children;
}
