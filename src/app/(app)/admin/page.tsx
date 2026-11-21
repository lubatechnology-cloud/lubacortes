import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AdminPanel } from "@/components/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect("/dashboard");
  return <AdminPanel />;
}
