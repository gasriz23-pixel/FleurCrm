import { redirect } from "next/navigation";
import { requireArea } from "../../lib/permissions";

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  try { await requireArea("SEARCH"); } catch { redirect("/dashboard"); }
  return children;
}
