"use client";

import { useState } from "react";
import Link from "next/link";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try { const r = await post<{ message: string }>("/api/auth/forgot-password", { email }); setMsg(r.message); }
    catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  return (
    <div className="card p-7 shadow-glow">
      <h1 className="text-2xl font-extrabold">Recuperar palavra-passe</h1>
      <p className="mt-1 text-sm muted">Enviaremos um link de recuperação (visível no terminal em desenvolvimento).</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label className="label">E-mail</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {error && <Alert tone="error">{error}</Alert>}
        {msg && <Alert tone="success">{msg}</Alert>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? <Spinner /> : "Enviar link"}</button>
      </form>
      <p className="mt-5 text-center text-xs muted"><Link href="/login" className="text-blue-500 hover:underline">Voltar ao login</Link></p>
    </div>
  );
}
