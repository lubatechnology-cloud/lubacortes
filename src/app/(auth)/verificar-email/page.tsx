"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { post } from "@/lib/client/api";
import { Alert, Spinner } from "@/components/ui";

function VerifyEmailInner() {
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); setMessage("Token ausente."); return; }
    post("/api/auth/verify-email", { token })
      .then(() => setState("ok"))
      .catch((e) => { setState("error"); setMessage((e as Error).message); });
  }, [params]);
  return (
    <div className="card p-7 text-center shadow-glow">
      <h1 className="text-2xl font-extrabold">Verificação de e-mail</h1>
      <div className="mt-6">
        {state === "loading" && <div className="flex justify-center"><Spinner size={26} /></div>}
        {state === "ok" && <Alert tone="success">E-mail verificado com sucesso!</Alert>}
        {state === "error" && <Alert tone="error">{message}</Alert>}
      </div>
      <Link href="/dashboard" className="btn-primary mt-6 w-full">Ir para o painel</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailInner /></Suspense>;
}
