import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <DashboardShell user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </DashboardShell>
  );
}
