"use client";

import { useEffect, useState } from "react";
import { api, del, put } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { UserRound, ShieldCheck, Monitor } from "lucide-react";

type Session = { id: string; ip: string | null; user_agent: string | null; created_at: string; expires_at: string };

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ name: string; email: string; email_verified_at: string | null } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<{ user: typeof profile }>("/api/auth/me"), api<{ sessions: Session[] }>("/api/sessions")])
      .then(([me, s]) => { setProfile(me.user); setName(me.user?.name ?? ""); setSessions(s.sessions); })
      .catch((e) => setError((e as Error).message));
  }, []);

  async function save() {
    setBusy(true); setError(""); setMsg("");
    try { await put("/api/profile", { name }); setMsg("Perfil actualizado."); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function revoke(id: string) {
    await del(`/api/sessions/${id}`);
    setSessions((s) => s.filter((x) => x.id !== id));
  }

  if (!profile) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Definições</h1>
      {error && <Alert tone="error">{error}</Alert>}
      {msg && <Alert tone="success">{msg}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><UserRound size={19} /> Perfil</h2>
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="mt-4"><label className="label">E-mail</label><input className="input opacity-60" value={profile.email} readOnly /></div>
          <p className="mt-3 text-xs muted">E-mail: {profile.email_verified_at ? "verificado ✓" : "por verificar"}</p>
          <button className="btn-primary mt-5" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Guardar alterações"}</button>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><ShieldCheck size={19} /> Segurança da conta</h2>
          <p className="text-sm muted">Cada utilizador tem uma conta individual. Os seus vídeos, projectos e pagamentos não são acessíveis a outras contas — o isolamento é aplicado no servidor.</p>
          <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-500">✓ Autenticação por sessão com cookie httpOnly<br />✓ Palavras-passe com hashing scrypt<br />✓ Protecção CSRF e bloqueio após tentativas falhadas</div>
        </div>
      </div>
      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Monitor size={19} /> Sessões activas</h2>
        {sessions.length === 0 ? <p className="text-sm muted">Sem sessões activas.</p> : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-xs" style={{ borderColor: "var(--border)" }}>
                <div className="min-w-0 flex-1"><p className="truncate">{s.user_agent || "Dispositivo desconhecido"}</p><p className="muted">{s.ip || "—"} · {new Date(s.created_at).toLocaleString("pt-AO")}</p></div>
                <button className="btn-ghost !px-2 !py-1 !text-[11px] text-rose-400" onClick={() => revoke(s.id)}>Revogar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
