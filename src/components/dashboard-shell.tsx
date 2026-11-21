"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FolderKanban, Library, CreditCard, Settings, Shield, LogOut, Plus, Menu } from "lucide-react";
import { useState } from "react";
import { Logo, ThemeToggle } from "@/components/ui";
import { post } from "@/lib/client/api";

const links = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/projectos", label: "Projectos", icon: FolderKanban },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/faturacao", label: "Planos e pagamentos", icon: CreditCard },
  { href: "/definicoes", label: "Definições", icon: Settings },
];

export function DashboardShell({ user, children }: { user: { name: string; email: string; role: string }; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await post("/api/auth/logout");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r p-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-8 px-2"><Logo size={34} /></div>
        <nav className="space-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${path === l.href ? "bg-blue-500/12 text-blue-500" : "muted hover:bg-blue-500/8"}`}>
              <l.icon size={18} /> {l.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${path === "/admin" ? "bg-cyan-500/12 text-cyan-500" : "muted hover:bg-blue-500/8"}`}>
              <Shield size={18} /> Administração
            </Link>
          )}
        </nav>
        <Link href="/dashboard" className="btn-primary mt-6"><Plus size={16} /> Novo projecto</Link>
        <div className="mt-auto space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] muted">{user.email}</p>
            </div>
            <ThemeToggle />
          </div>
          <button onClick={logout} className="btn-ghost w-full !justify-start !text-red-400"><LogOut size={16} /> Terminar sessão</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b px-5 py-3 backdrop-blur" style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)", borderColor: "var(--border)" }}>
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <span className="text-sm font-semibold">Lubacortes</span>
          <span className="badge ml-auto bg-cyan-500/10 text-cyan-500">Modo teste</span>
        </header>
        <main className="mx-auto max-w-7xl p-5 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
