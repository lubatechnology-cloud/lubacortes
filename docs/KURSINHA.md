# Pagamentos por Kursinha (cobrança real)

**Estado:** integração implementada e testada ponta a ponta. Cobrança real activada (confirmado pelo utilizador).

## Como funciona

1. O utilizador escolhe um plano/pacote em `/faturacao` e selecciona **Kursinha**.
2. `POST /api/billing/checkout` cria um pagamento `mode = live` com `meta.adapter = "kursinha"`
   e devolve o `checkoutUrl` do produto Kursinha; o browser é redirecionado.
3. A Kursinha envia `sale.approved` para
   `https://lubacortes.vercel.app/api/payments/kursinha-webhook?key=<KURSINHA_WEBHOOK_SECRET>`.
4. O webhook valida a chave partilhada (ou HMAC `X-Webhook-Signature` sobre o **raw body**, quando
   a Kursinha passar a enviar assinatura), é idempotente por `event + saleId`, localiza o pagamento
   pendente pelo **e-mail do comprador + produto mapeado + valor**, e confirma:
   credita os créditos e/ou activa o plano/pacote.
5. Só um webhook válido desbloqueia. Clique de botão não desbloqueia nada.

A Kursinha não publica uma API de criação de cobrança; a documentação oficial
(`kursinha1/kursinha-docs`) cobre apenas webhooks (`sale.pending`, `sale.approved`, `sale.cancelled`)
e checkout alojado (`https://pay.kursinha.com/c/<productId>`). Este é o fluxo automático disponível.

## Configuração em produção

| Variável | Finalidade |
|---|---|
| `KURSINHA_WEBHOOK_SECRET` | chave partilhada na URL do webhook / validação HMAC |
| `KURSINHA_PRODUCTS` | JSON mapeando `planId`/`packId` → `{ id, url }` da Kursinha |

Estão definidas na Vercel, em `keys.txt` e em `.env.local` (nunca versionadas).

## Produtos e webhook na Kursinha (conta Repair Luba Tec)

- Criado produto **"Lubacortes - Plano CRIADOR"**, 3 500 Kz, pagamento único,
  entrega por link para `https://lubacortes.vercel.app/faturacao`.
  - ID/checkout: `6b080e8a214197e42e3391b4`
  - `https://pay.kursinha.com/c/6b080e8a214197e42e3391b4`
  - **Estado: em análise** — o link só fica activo depois de a Kursinha aprovar o produto.
- Webhook **"Lubacortes"**, global, evento **Compra aprovada**, activo, apontando para a URL acima.

## Verificação real

- `POST /api/billing/checkout` (admin, `plan_creator`) → 201, pagamento `live`, checkoutUrl devolvido.
- `POST` webhook com `saleId=KUR-TEST-001` → 200 `pagamento confirmado`.
- Base de dados: pagamento `paid`, `provider_ref=KUR-TEST-001`; utilizador admin com `plan_creator` activo.
- Segunda entrega do mesmo `saleId` → ignorada por idempotência.
- Sem chave/assinatura → 401.

## O que falta na Kursinha (acção sua)

1. **Aprovação do produto** "Lubacortes - Plano CRIADOR" pela equipa da Kursinha.
2. Criar os restantes produtos (PROFISSIONAL 7 500 Kz, AGÊNCIA 17 500 Kz e pacotes 60/150/300/600 min)
   e acrescentar os IDs/URLs ao JSON `KURSINHA_PRODUCTS`.

Enquanto um plano/pacote não estiver mapeado, o botão Kursinha devolve
`kursinha_product_missing` e os métodos de teste continuam disponíveis.
