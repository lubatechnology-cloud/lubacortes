import { all, get } from "./db";

function valor(sql: string, ...p: unknown[]): number {
  const linha = get<{ n: number }>(sql, ...p);
  return Number(linha?.n ?? 0);
}

/** Métricas no formato Prometheus, protegidas por METRICS_TOKEN. */
export function metricasPrometheus(): string {
  const linhas: string[] = [];
  const add = (nome: string, ajuda: string, valor: number, tipo = "gauge") => {
    linhas.push(`# HELP ${nome} ${ajuda}`, `# TYPE ${nome} ${tipo}`, `${nome} ${valor}`);
  };

  add("lubacortes_users_total", "Utilizadores registados", valor("SELECT COUNT(*) n FROM users"));
  add("lubacortes_projects_total", "Projectos criados", valor("SELECT COUNT(*) n FROM projects"));
  add("lubacortes_clips_total", "Cortes gerados", valor("SELECT COUNT(*) n FROM clips"));
  add("lubacortes_clips_ready", "Cortes prontos", valor("SELECT COUNT(*) n FROM clips WHERE status='ready'"));
  add("lubacortes_jobs_queued", "Tarefas na fila", valor("SELECT COUNT(*) n FROM jobs WHERE status='queued'"));
  add("lubacortes_jobs_running", "Tarefas em execução", valor("SELECT COUNT(*) n FROM jobs WHERE status='running'"));
  add("lubacortes_jobs_failed", "Tarefas falhadas", valor("SELECT COUNT(*) n FROM jobs WHERE status='failed'"));
  add("lubacortes_errors_24h", "Erros de processamento nas últimas 24h", valor("SELECT COUNT(*) n FROM processing_errors WHERE created_at > ?", new Date(Date.now() - 86_400_000).toISOString()));
  add("lubacortes_revenue_paid_cents", "Receita confirmada em cêntimos", valor("SELECT COALESCE(SUM(amount_cents),0) n FROM payments WHERE status='paid'"));
  add("lubacortes_measured_cost_cents", "Custo medido em cêntimos", valor("SELECT COALESCE(SUM(cost_cents),0) n FROM cost_records"));
  add("lubacortes_api_calls_24h", "Chamadas de API nas últimas 24h", valor("SELECT COUNT(*) n FROM api_usage WHERE created_at > ?", new Date(Date.now() - 86_400_000).toISOString()));

  for (const serviço of all<{ service: string; operation: string; total: number }>(
    "SELECT service,operation,COUNT(*) total FROM api_usage GROUP BY service,operation",
  )) {
    const nome = `lubacortes_api_calls{service="${serviço.service}",operation="${serviço.operation}"}`;
    linhas.push(`# TYPE ${nome.split("{")[0]} counter`, `${nome} ${serviço.total}`);
  }
  return linhas.join("\n") + "\n";
}
