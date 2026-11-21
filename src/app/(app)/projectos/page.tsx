import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { EmptyState, StatusBadge } from "@/components/ui";
import { Film, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = all<{ id: string; title: string; status: string; duration: number | null; created_at: string; source_type: string }>(
    "SELECT id,title,status,duration,created_at,source_type FROM projects WHERE user_id=? ORDER BY created_at DESC", user.id);
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-extrabold">Projectos</h1><p className="text-sm muted">Todos os vídeos que analisou.</p></div>
        <Link href="/dashboard" className="btn-primary"><Plus size={16} /> Novo projecto</Link>
      </div>
      {projects.length === 0 ? <EmptyState title="Nenhum projecto" description="Importe um vídeo para começar." action={<Link href="/dashboard" className="btn-primary">Criar projecto</Link>} /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projecto/${p.id}`} className="card card-hover p-5">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-500"><Film size={20} /></div>
              <h3 className="truncate font-bold">{p.title}</h3>
              <p className="mt-1 text-xs muted">{p.source_type === "url" ? "URL" : "Ficheiro"} · {p.duration ? `${Math.round(p.duration)} segundos` : "—"}</p>
              <div className="mt-4 flex items-center justify-between">
                <StatusBadge status={p.status} />
                <span className="text-[11px] muted">{new Date(p.created_at).toLocaleDateString("pt-AO")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
