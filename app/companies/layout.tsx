import { redirect } from "next/navigation";
import { requireArea } from "../../lib/permissions";

export default async function CompaniesLayout({ children }: { children: React.ReactNode }) {
  try { await requireArea("CRM"); } catch { redirect("/dashboard"); }
  return children;
}
