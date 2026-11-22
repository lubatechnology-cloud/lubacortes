# Monitorização — Lubacortes

## Métricas Prometheus
A aplicação expõe `/api/metrics` no formato Prometheus com contadores de utilizadores,
projectos, cortes, tarefas, erros, receita, custo medido e chamadas de API.

- Sem `METRICS_TOKEN`: endpoint público (apenas agregados, sem dados pessoais).
- Com `METRICS_TOKEN`: enviar `Authorization: Bearer <token>` ou `X-Metrics-Token`.

## Subir Prometheus + Grafana
```bash
docker compose -f docker-compose.monitoring.yml up -d
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (password padrão `admin`, alterar `GRAFANA_PASSWORD`)

No Grafana: Add data source → Prometheus → URL `http://prometheus:9090`.
Importar um dashboard com as métricas `lubacortes_*`.

## Sentry
Definir `SENTRY_DSN` na Vercel e no worker para capturar excepções automaticamente.
Para Sentry self-hosted, seguir https://develop.sentry.dev/self-hosted/ e usar o DSN gerado.

## Custos
Os custos são medidos em `cost_records` com tarifas configuradas em `settings`
(`cost.<serviço>.<operação>_cents`). O painel administrativo mostra barras por serviço.
Receita e custo são apresentados separadamente — sem margens fictícias.
