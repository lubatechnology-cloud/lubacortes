"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await post("/api/auth/reset-password", { token: params.get("token") ?? "", password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  }
  return (
    <div className="card p-7 shadow-glow">
      <h1 className="text-2xl font-extrabold">Nova palavra-passe</h1>
      {done ? <div className="mt-6"><Alert tone="success">Palavra-passe alterada. A redireccionar…</Alert></div> : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="label">Nova palavra-passe</label><input className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? <Spinner /> : "Guardar"}</button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordInner /></Suspense>;
}
