"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";
import { GoogleButton } from "@/components/google-button";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await post("/api/auth/login", { email, password });
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="card p-7 shadow-glow">
      <h1 className="text-2xl font-extrabold">Bem-vindo de volta</h1>
      <p className="mt-1 text-sm muted">Entre na sua conta Lubacortes.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label className="label">E-mail</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.ao" /></div>
        <div><label className="label">Palavra-passe</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
        {error && <Alert tone="error">{error}</Alert>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? <Spinner /> : "Entrar"}</button>
      </form>
      <GoogleButton next={params.get("next") || "/dashboard"} />
      <div className="mt-5 flex justify-between text-xs muted">
        <Link href="/esqueci-senha" className="text-blue-500 hover:underline">Esqueci a palavra-passe</Link>
        <Link href="/registar" className="text-blue-500 hover:underline">Criar conta</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
