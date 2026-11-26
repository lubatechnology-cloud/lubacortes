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

Foram criados **8 produtos** (pagamento único, entrega por link para
`https://lubacortes.vercel.app/faturacao`) e mapeados em `KURSINHA_PRODUCTS`:

| Chave | Produto | Preço | ID |
|---|---|---|---|
| `plan_creator` | Lubacortes - Plano CRIADOR | 3 500 Kz | `6b080e8a214197e42e3391b4` |
| `plan_pro` | Lubacortes - Plano PROFISSIONAL | 7 500 Kz | `6b0825c24c170ae40430b923` |
| `plan_agency` | Lubacortes - Plano AGÊNCIA | 17 500 Kz | `6b0827634c170ae40430b929` |
| `pack_60` | Lubacortes - Pacote 60 minutos | 2 000 Kz | `6b0827e2338f86fd4f6a3a39` |
| `pack_150` | Lubacortes - Pacote 150 minutos | 4 500 Kz | `6b0827ef9c32e3f67976f5d4` |
| `pack_300` | Lubacortes - Pacote 300 minutos | 8 000 Kz | `6b08289f338f86fd4f6a3a41` |
| `pack_600` | Lubacortes - Pacote 600 minutos | 14 000 Kz | `6b0828c232ff5fc9da35a1da` |
| `credits` | Lubacortes - Créditos de desbloqueio | 1 500 Kz | `6b0828de4c170ae40430b93a` |

Cada checkout é `https://pay.kursinha.com/c/<ID>`.

- Webhook **"Lubacortes"**, global, evento **Compra aprovada**, activo, apontando para
  `https://lubacortes.vercel.app/api/payments/kursinha-webhook?key=<secret>`.

## Verificação real

- `POST /api/billing/checkout` (admin, `plan_creator`) → 201, pagamento `live`, checkoutUrl devolvido.
- `POST` webhook com `saleId=KUR-TEST-001` → 200 `pagamento confirmado`.
- Base de dados: pagamento `paid`, `provider_ref=KUR-TEST-001`; utilizador admin com `plan_creator` activo.
- Segunda entrega do mesmo `saleId` → ignorada por idempotência.
- Sem chave/assinatura → 401.

## O que falta na Kursinha (acção sua)

**Aprovação dos produtos** pela equipa da Kursinha. Na lista `/produtos` da conta,
o "Plano CRIADOR" já aparece como **Ativo**; os restantes estão **Em análise** e os
respectivos links de checkout só ficam activos após aprovação.

Enquanto um produto não estiver aprovado, a compra pode ser criada na Lubacortes mas o
checkout da Kursinha recusará o pagamento — os métodos de teste continuam disponíveis.
