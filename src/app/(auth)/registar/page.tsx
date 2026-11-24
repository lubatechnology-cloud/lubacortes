"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { GoogleButton } from "@/components/google-button";

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await post("/api/auth/register", form);
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="card p-7 shadow-glow">
      <h1 className="text-2xl font-extrabold">Criar conta grátis</h1>
      <p className="mt-1 text-sm muted">Um corte gratuito à sua espera. Sem cartão de crédito.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label className="label">Nome</label><input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="O seu nome" /></div>
        <div><label className="label">E-mail</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="voce@exemplo.ao" /></div>
        <div><label className="label">Palavra-passe</label><input className="input" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" /></div>
        {error && <Alert tone="error">{error}</Alert>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? <Spinner /> : "Criar conta"}</button>
      </form>
      <GoogleButton next={params.get("next") || "/dashboard"} label="Registar com Google" />
      <p className="mt-5 text-center text-xs muted">Já tem conta? <Link href="/login" className="text-blue-500 hover:underline">Entrar</Link></p>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterInner /></Suspense>;
}
