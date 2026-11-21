import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="hero-gradient grid-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6"><Logo size={42} /></div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs muted">Interface em Português de Angola · Suporte a múltiplos idiomas</p>
    </main>
  );
}
