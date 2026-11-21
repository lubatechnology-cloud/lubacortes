import { SiTiktok, SiInstagram, SiFacebook, SiYoutube } from "react-icons/si";

const REDES = [
  { nome: "TikTok", Icone: SiTiktok, cor: "#010101" },
  { nome: "Instagram", Icone: SiInstagram, cor: "#E4405F" },
  { nome: "Facebook", Icone: SiFacebook, cor: "#1877F2" },
  { nome: "YouTube", Icone: SiYoutube, cor: "#FF0000" },
];

export function SocialLogos({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-center ${compact ? "gap-2" : "gap-3"}`}>
      {REDES.map(({ nome, Icone, cor }) => (
        <span
          key={nome}
          className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: "#e2e8f0" }}
          title={nome}
        >
          <Icone size={compact ? 16 : 19} style={{ color: cor }} aria-hidden="true" />
          {nome}
        </span>
      ))}
    </div>
  );
}
