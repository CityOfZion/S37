# FractaPay — Backlog de Desenvolvimento (Hackathon + Fase 1 + Fase 2)

> **Time:** 3 Frontend (FE1, FE2, FE3) + 1 Backend/Smart Contracts (BE/SC)
> **Escopo:** Roadmap 9.1 (Hackathon) + 9.2 (Fase 1, 60 dias) + 9.3 (Fase 2, 60–120 dias)
> **Convenção de issue:** `[EPIC.N.M] [Papel] Título` — com depend, estimativa, fase
> **Fases:** `H` = Hackathon (9.1) · `F1` = Fase 1 pós-hackathon (9.2) · `F2` = Fase 2 (9.3)
> **Estimativas:** P (≤1d), M (1–3d), G (3–5d), GG (5–10d)

---

## Sumário de Epics

| # | Epic | Fase principal | Owner |
|---|------|----------------|-------|
| 0 | Infraestrutura & DevEx | H/F1 | BE (+FE3 ajuda FE pipeline) |
| 1 | Autenticação & Onboarding (Passkey Stellar não-custodial) | F1 | BE + FE1 |
| 2 | Smart Contracts Soroban | H/F1/F2 | BE/SC |
| 3 | Backend Core API | H/F1 | BE |
| 4 | Agente IA Conversacional | H/F1/F2 | BE + FE2 |
| 5 | Frontend Web App (Visual) | H/F1/F2 | FE1, FE2, FE3 |
| 6 | Off-ramp Mercuryo / PIX | F1 | BE + FE1 |
| 7 | Observabilidade, Segurança & Compliance | F1/F2 | BE + FE1 |
| 8 | x402 / Pagamentos Agênticos (visibilidade) | F2+ | BE |
| 9 | QA, Testes & Demo | H/F1/F2 | TODOS |

---

## EPIC 0 — Infraestrutura & DevEx

**Owner:** BE/SC (com FE3 auxiliando no pipeline FE)
**Objetivo:** Esqueleto de infra, CI/CD, observabilidade e ambientes prontos antes do código de produto crescer.

### Issues

- **[0.1] [BE] Provisionar contas AWS (dev/staging/prod) com SCP e IAM mínimos** · Fase: H · Est: M · Dep: —
- **[0.2] [BE] Repositório Terraform: VPC, subnets, SG, NAT, Route53 zone** · Fase: H · Est: G · Dep: 0.1
- **[0.3] [BE] RDS MariaDB (private subnet, encryption-at-rest KMS, backup diário)** · Fase: H · Est: M · Dep: 0.2
- **[0.4] [BE] ECS Fargate cluster + ALB + target groups para `server`** · Fase: H · Est: M · Dep: 0.2
- **[0.5] [BE] S3 bucket + CloudFront + ACM + SPA fallback para `web`** · Fase: H · Est: M · Dep: 0.2
- **[0.6] [BE] AWS Secrets Manager + Parameter Store (rotação habilitada)** · Fase: H · Est: P · Dep: 0.1
- **[0.7] [BE] GitHub Actions: lint + test + build por workspace (matrix)** · Fase: H · Est: M · Dep: —
- **[0.8] [BE] GitHub Actions: deploy testnet/staging/prod (manual approval em prod)** · Fase: F1 · Est: G · Dep: 0.4, 0.5
- **[0.9] [BE] Logs estruturados (pino → CloudWatch) + correlation IDs** · Fase: H · Est: M · Dep: 0.4
- **[0.10] [BE] Sentry FE+BE (DSN segregada por ambiente)** · Fase: F1 · Est: P · Dep: —
- **[0.11] [BE] Backup automatizado RDS, definir RPO 24h / RTO 1h** · Fase: F1 · Est: P · Dep: 0.3
- **[0.12] [BE] Domínio fractapay.app + ACM + DNS records** · Fase: F1 · Est: P · Dep: 0.2
- **[0.13] [BE/SC] Soroban testnet deploy automation (Makefile + GH Action)** · Fase: H · Est: M · Dep: 0.7
- **[0.14] [BE/SC] Wallet operacional FractaPay com multisig (recipient de taxa)** · Fase: F1 · Est: M · Dep: —
- **[0.15] [FE3] Setup `web/` Vite + Tailwind + lint/format/test (Vitest+Playwright)** · Fase: H · Est: M · Dep: 0.7
- **[0.16] [BE] Setup `server/` Fastify + TS + Zod + pino + tsx watch** · Fase: H · Est: M · Dep: 0.7
- **[0.17] [BE] CDN + headers de segurança (CSP, HSTS, X-Frame-Options)** · Fase: F1 · Est: P · Dep: 0.5

**Sequenciamento crítico:** 0.1 → 0.2 → (0.3, 0.4, 0.5 paralelo) → 0.13 → 0.16 destrava todo BE; 0.15 destrava todo FE.

---

## EPIC 1 — Autenticação & Onboarding

**Owner:** BE (core auth + wallet) · FE1 (UI)
**Objetivo:** Login social + Passkey Stellar não-custodial (Smart Wallet via WebAuthn) com provisionamento invisível de carteira.

### Issues

- **[1.1] [BE/SC] Implementar Stellar Passkey Kit / Smart Wallet contract base** · Fase: F1 · Est: GG · Dep: 0.13
- **[1.2] [BE] Endpoint `POST /auth/passkey/register` (challenge + verify)** · Fase: F1 · Est: M · Dep: 1.1
- **[1.3] [BE] Endpoint `POST /auth/passkey/login` (assertion verify + JWT)** · Fase: F1 · Est: M · Dep: 1.1
- **[1.4] [BE] OAuth2 Google: associar identidade social ao smart wallet** · Fase: F1 · Est: G · Dep: 1.2
- **[1.5] [BE] JWT access (15min) + refresh tokens (httpOnly cookie, 30d)** · Fase: F1 · Est: M · Dep: 1.2
- **[1.6] [BE] Modelo: `users`, `organizations`, `memberships`, `roles`** · Fase: F1 · Est: M · Dep: 0.3
- **[1.7] [BE] Endpoints `/me`, `/organization`, `/members` (CRUD)** · Fase: F1 · Est: M · Dep: 1.5, 1.6
- **[1.8] [BE] Recuperação de acesso: segundo passkey + email confirm flow** · Fase: F1 · Est: G · Dep: 1.2
- **[1.9] [FE1] Tela `Login` (botão social + botão passkey + estado loading/erro)** · Fase: F1 · Est: M · Dep: 5.2
- **[1.10] [FE1] Wizard de onboarding: 3 passos (boas-vindas, empresa, primeiro contrato)** · Fase: F1 · Est: G · Dep: 1.9
- **[1.11] [FE1] Provisionamento de wallet "invisível": loading com microcopy ("Preparando sua conta…")** · Fase: F1 · Est: M · Dep: 1.10
- **[1.12] [FE1] Tela de membros/convites (B2B)** · Fase: F1 · Est: G · Dep: 1.7
- **[1.13] [FE1+BE] Fluxo de revogação de sessão / logout em todos os devices** · Fase: F1 · Est: M · Dep: 1.5
- **[1.14] [FE1] Recuperação de acesso (UI do 1.8)** · Fase: F1 · Est: M · Dep: 1.8

**Risco:** 1.1 é o maior risco técnico — alocar BE/SC com tempo dedicado, considerar contratar consultoria Stellar pontual.

---

## EPIC 2 — Smart Contracts Soroban

**Owner:** BE/SC

### Issues

- **[2.1] [SC] Refactor `batch_pay` PoC → contrato com armazenamento persistente** · Fase: H · Est: G · Dep: 0.13
  - ✅ Implementado em `contracts/src/lib.rs` como `FractaPayContract` v0.4.0. Modelo de débito direto da carteira do pagador (sem escrow pool on-chain). `[2.2]` factory/balde N/A nesta arquitetura.
- **[2.2] [SC] Provisionamento de endereço balde por contrato (factory pattern)** · Fase: F1 · Est: G · Dep: 2.1
- **[2.3] [SC] Storage: regras por destinatário (`enum Rule { Fixed(u128), Percent(u32) }`)** · Fase: F1 · Est: M · Dep: 2.1
- **[2.4] [SC] Storage: cronograma (timestamp_próximo, periodicity)** · Fase: F1 · Est: M · Dep: 2.1
- **[2.5] [SC] Função `execute()`: validar trigger → debitar taxa 1,5% → distribuir → emitir eventos** · Fase: F1 · Est: GG · Dep: 2.3, 2.4
- **[2.6] [SC] Máquina de estados `Active|Paused|Ended` + guards de transição** · Fase: F1 · Est: M · Dep: 2.1
- **[2.7] [SC] Funções `pause()`, `resume()`, `end()` (auth: owner do contrato)** · Fase: F1 · Est: M · Dep: 2.6
- **[2.8] [SC] Funções `add_recipient()`, `remove_recipient()`, `update_rule()`** · Fase: F1 · Est: G · Dep: 2.6
- **[2.9] [SC] Eventos: `execution_started`, `transfer_executed`, `fee_collected`, `state_changed`** · Fase: F1 · Est: M · Dep: 2.5
- **[2.10] [SC] Edge case balde subfinanciado: estratégia configurável (`Proportional|Block`)** · Fase: F1 · Est: G · Dep: 2.5
- **[2.11] [SC] Pagamento pontual (`execute_once(recipients, amounts)`) sobre contrato recorrente** · Fase: F2 · Est: G · Dep: 2.5
- **[2.12] [SC] Testes unitários Rust (coverage ≥ 85%)** · Fase: H/F1 · Est: G · Dep: 2.5
- **[2.13] [SC] Testes integração em testnet (cenários: 1 dest, 100 dests, regra mista, pausado)** · Fase: F1 · Est: M · Dep: 2.12
- **[2.14] [SC] Documentação técnica do contrato (estado, eventos, ABI)** · Fase: F1 · Est: M · Dep: 2.5
- **[2.15] [SC] Preparação para auditoria externa (threat model + escopo + budget)** · Fase: F2 · Est: M · Dep: 2.13
- **[2.16] [SC] Aplicar correções de auditoria** · Fase: F2 · Est: G · Dep: 2.15
- **[2.17] [SC] Migração mainnet (deploy, verify, anúncio)** · Fase: F2 · Est: M · Dep: 2.16

**Caminho crítico hackathon:** 0.13 → 2.1 → 2.5 (versão simplificada batch único) → 2.12.

---

## EPIC 3 — Backend Core API

**Owner:** BE

### Issues

- **[3.1] [BE] Fastify boilerplate + Zod schemas + error handler global** · Fase: H · Est: P · Dep: 0.16
- **[3.2] [BE] Setup Prisma + primeira migration (`users`, `organizations`)** · Fase: F1 · Est: M · Dep: 0.3
- **[3.3] [BE] Modelo `contracts` (id, soroban_addr, name, owner_id, status, schedule_meta)** · Fase: F1 · Est: M · Dep: 3.2
- **[3.4] [BE] Modelo `recipients` (id, contract_id, name, pix_key_encrypted, cpf_cnpj_encrypted, stellar_address)** · Fase: F1 · Est: M · Dep: 3.3
- **[3.5] [BE] Modelo `executions` (id, contract_id, tx_hash, status, total_amount, fee_amount, executed_at)** · Fase: F1 · Est: M · Dep: 3.3
- **[3.6] [BE] Modelo `conversations` + `messages` + attachments** · Fase: H · Est: M · Dep: 3.2
- **[3.7] [BE] CRUD `/contracts` (list, detail, create, update, archive)** · Fase: F1 · Est: G · Dep: 3.3
- **[3.8] [BE] CRUD `/contracts/:id/recipients`** · Fase: F1 · Est: M · Dep: 3.4
- **[3.9] [BE] GET `/contracts/:id/executions` + `/executions/:id`** · Fase: F1 · Est: M · Dep: 3.5
- **[3.10] [BE] Stellar SDK wrapper: createWallet, fundWallet, readBalance, submitTx** · Fase: H · Est: G · Dep: 2.1
- **[3.11] [BE] Reconciliation worker (consumer de eventos Soroban → atualiza `executions`)** · Fase: F1 · Est: G · Dep: 2.9, 3.5
- **[3.12] [BE] Scheduler/cron worker (BullMQ + Redis) para triggers de execução** · Fase: F1 · Est: G · Dep: 3.7
- **[3.13] [BE] Criptografia de PII (KMS envelope encryption para pix_key/cpf)** · Fase: F1 · Est: M · Dep: 3.4
- **[3.14] [BE] Rate limit (fastify-rate-limit) + helmet + CORS** · Fase: F1 · Est: P · Dep: 3.1
- **[3.15] [BE] OpenAPI 3 spec gerado de Zod + Swagger UI em /docs** · Fase: F1 · Est: M · Dep: 3.7
- **[3.16] [BE] Webhook de healthcheck para uptime monitoring (Better Uptime/Pingdom)** · Fase: F1 · Est: P · Dep: 3.1

---

## EPIC 4 — Agente IA Conversacional

**Owner:** BE (motor) + FE2 (UI)

### Issues

- **[4.1] [BE] Integrar Anthropic SDK com Claude Sonnet 4.6 (configurável por env)** · Fase: H · Est: M · Dep: 0.16
- **[4.2] [BE] Definir conjunto de tools (JSON schema): `create_contract_draft`, `list_contracts`, `get_contract_detail`, `update_contract`, `pause_contract`, `resume_contract`, `end_contract`, `get_balde_balance`, `simulate_execution`, `add_recipient`, `remove_recipient`** · Fase: H/F1 · Est: G · Dep: 4.1, 3.7
- **[4.3] [BE] Pipeline de parsing de arquivos: CSV (papaparse), XLSX (sheetjs), PDF (pdf-parse), imagem (AWS Textract)** · Fase: H · Est: G · Dep: 4.1
- **[4.4] [BE] SSE streaming endpoint `/agent/stream`** · Fase: H · Est: M · Dep: 4.1
- **[4.5] [BE] Persistência de conversa + retomada de contexto** · Fase: F1 · Est: M · Dep: 3.6
- **[4.6] [BE] Prompt system + few-shot (royalties editora, folha PJ/CLT, comissões)** · Fase: H/F1 · Est: G · Dep: 4.1
- **[4.7] [BE] Guard rail: nenhuma tool de commit on-chain executa sem confirmação humana via tool `confirm_contract_commit`** · Fase: H · Est: M · Dep: 4.2
- **[4.8] [BE] Sistema de feedback (thumbs up/down + comentário) por turno** · Fase: F1 · Est: M · Dep: 4.5
- **[4.9] [BE] Operações conversacionais completas (consultar/alterar/pausar/excluir via NL)** · Fase: F2 · Est: G · Dep: 4.2, 3.7
- **[4.10] [FE2] UI de chat: bolhas, streaming, anexos, sugestões rápidas, indicador "agente digitando"** · Fase: H/F1 · Est: GG · Dep: 5.2
- **[4.11] [FE2] Visualizador inline de anexos (CSV/XLSX/PDF/PNG) no chat** · Fase: F1 · Est: G · Dep: 4.10
- **[4.12] [FE2] Tela de revisão do contrato proposto pelo agente: tabela editável (destinatário, regra, valor)** · Fase: H · Est: G · Dep: 4.10
- **[4.13] [FE2] Tela de confirmação on-chain: preview da transação + estimativa de taxa + botão final** · Fase: H · Est: M · Dep: 4.12
- **[4.14] [FE2] Quick actions / slash commands ("/listar", "/pausar contrato X", "/saldo")** · Fase: F2 · Est: M · Dep: 4.9
- **[4.15] [FE2] Histórico de conversas com pesquisa** · Fase: F2 · Est: M · Dep: 4.5

---

## EPIC 5 — Frontend Web App (UI Visual)

**Owner:** FE3 (lead da arquitetura FE + telas de dados), FE1 (auth/settings), FE2 (chat/IA)

### Issues

- **[5.1] [FE3] Setup TanStack Query + Zustand + React Router + axios client** · Fase: H · Est: M · Dep: 0.15
- **[5.2] [FE3] Implementar design system (ver `FractaPay_DesignSystem.md`): tokens → Tailwind config → componentes base (Button, Input, Textarea, Select, Card, Badge, Modal, Drawer, Toast, Table, Avatar, Skeleton)** · Fase: H · Est: GG · Dep: 5.1
- **[5.3] [FE3] Layout shell mobile-first (sidebar colapsável, topbar, bottom nav mobile)** · Fase: H · Est: G · Dep: 5.2
- **[5.4] [FE3] Dashboard Home: cards de saldo total, próximas execuções, atividade recente** · Fase: F1 · Est: G · Dep: 5.3, 3.7
- **[5.5] [FE3] Lista de contratos: filtros (estado, periodicidade), search, ordenação, empty state** · Fase: F1 · Est: G · Dep: 5.4
- **[5.6] [FE3] Detalhe de contrato: header com saldo do balde, tabs (Regras, Destinatários, Histórico), ações (pausar/retomar/encerrar/editar)** · Fase: F1 · Est: GG · Dep: 5.5
- **[5.7] [FE3] Página do destinatário: dados, contratos vinculados, recibos** · Fase: F1 · Est: G · Dep: 5.6
- **[5.8] [FE3] Detalhe de execução / recibo: cabeçalho amigável + accordion "Detalhes técnicos" com hash, link Stellar Explorer, fee on-chain** · Fase: F1 · Est: G · Dep: 5.7
- **[5.9] [FE1] Configurações de conta + integrações (Mercuryo connect)** · Fase: F1 · Est: M · Dep: 5.3, 6.1
- **[5.10] [FE1] Gestão de membros + convites + papéis** · Fase: F1 · Est: G · Dep: 1.7
- **[5.11] [FE3] Página pública de auditoria (acessível ao destinatário sem login completo)** · Fase: F2 · Est: G · Dep: 5.8
- **[5.12] [FE3] Sistema de notificações: toasts + bell + centro de notificações** · Fase: F1 · Est: G · Dep: 5.3
- **[5.13] [FE3] Empty states, error boundaries, loading skeletons em todas as telas** · Fase: F1 · Est: M · Dep: 5.2
- **[5.14] [FE3] Acessibilidade WCAG AA: foco visível, contraste, ARIA, navegação por teclado** · Fase: F1 · Est: G · Dep: 5.2
- **[5.15] [FE3] i18n (react-i18next, pt-BR default, en como secundário)** · Fase: F2 · Est: M · Dep: 5.2
- **[5.16] [FE2] Tela "Como funciona" no onboarding (explica o produto sem mencionar blockchain)** · Fase: F1 · Est: M · Dep: 5.2
- **[5.17] [FE3] Tema escuro (dark mode toggle)** · Fase: F2 · Est: M · Dep: 5.2
- **[5.18] [FE2] Mock Service Worker (MSW) para desenvolvimento FE independente do BE** · Fase: H · Est: M · Dep: 5.1

> **Estratégia anti-bottleneck:** 5.18 (MSW) permite que os 3 FEs avancem em paralelo enquanto o BE entrega endpoints reais. Crítico nas semanas 1–3.

---

## EPIC 6 — Off-ramp Mercuryo / PIX

**Owner:** BE (integração) + FE1 (UI)

### Issues

- **[6.1] [BE] Integrar Mercuryo API sandbox (auth, criar transação USDC→BRL)** · Fase: F1 · Est: G · Dep: 0.6
- **[6.2] [BE] Endpoint `POST /offramp/recipients` (cadastrar destinatário Mercuryo)** · Fase: F1 · Est: M · Dep: 6.1, 3.4
- **[6.3] [BE] Endpoint `POST /offramp/payouts` (iniciar conversão+PIX após execução on-chain)** · Fase: F1 · Est: G · Dep: 6.2
- **[6.4] [BE] Webhook receiver `/webhooks/mercuryo` + verificação de assinatura** · Fase: F1 · Est: M · Dep: 6.3
- **[6.5] [BE] Reconciliation: ligar `mercuryo_payout_id` ↔ `stellar_tx_hash` ↔ `execution_id`** · Fase: F1 · Est: M · Dep: 6.4, 3.11
- **[6.6] [BE] Retry strategy + dead-letter queue para webhooks Mercuryo falhos** · Fase: F1 · Est: M · Dep: 6.4
- **[6.7] [FE1] Formulário PIX do destinatário (chave PIX, CPF/CNPJ, nome completo, validação)** · Fase: F1 · Est: M · Dep: 5.2
- **[6.8] [FE1] Consent + microcopy LGPD na coleta de dados** · Fase: F1 · Est: P · Dep: 6.7
- **[6.9] [FE1] Status do payout no recibo: "Pendente" → "Convertendo" → "Enviado via PIX"** · Fase: F1 · Est: M · Dep: 5.8
- **[6.10] [BE] Provedor secundário de off-ramp (homologação Transfero ou similar) para redundância** · Fase: F2 · Est: GG · Dep: 6.5

---

## EPIC 7 — Observabilidade, Segurança & Compliance

**Owner:** BE + FE1

### Issues

- **[7.1] [BE+FE1] Política de privacidade + termos de uso (revisão jurídica)** · Fase: F1 · Est: M · Dep: —
- **[7.2] [BE] Consent management + direito ao esquecimento (LGPD)** · Fase: F1 · Est: G · Dep: 3.13
- **[7.3] [BE] TLS 1.3 enforced + HSTS + KMS encryption at rest** · Fase: F1 · Est: M · Dep: 0.17
- **[7.4] [BE] Audit log imutável de toda mudança de estado de contrato (append-only)** · Fase: F1 · Est: G · Dep: 3.7
- **[7.5] [BE] Métricas: latência API, taxa erro, taxa parsing IA, fila de payouts** · Fase: F1 · Est: M · Dep: 0.9
- **[7.6] [BE] Alarms: falha de execução, balde subfinanciado, webhook Mercuryo falhando, taxa erro >1%** · Fase: F1 · Est: M · Dep: 7.5
- **[7.7] [BE] Pentest externo pré-mainnet** · Fase: F2 · Est: G · Dep: 6.5
- **[7.8] [BE] Bug bounty program (HackerOne/Immunefi)** · Fase: F2 · Est: M · Dep: 7.7
- **[7.9] [FE1] Banner de cookies + consent toggle** · Fase: F1 · Est: P · Dep: 7.1
- **[7.10] [BE] DPIA (Data Protection Impact Assessment) — LGPD** · Fase: F1 · Est: M · Dep: 7.1

---

## EPIC 8 — x402 / Pagamentos Agênticos (Visibilidade)

**Owner:** BE — fase exploratória

### Issues

- **[8.1] [BE] Spike técnico: integrar facilitador x402 OpenZeppelin sobre testnet** · Fase: F2 · Est: G · Dep: 2.17
- **[8.2] [BE] Endpoint paywalled `/agent/query` com x402** · Fase: F2 · Est: G · Dep: 8.1
- **[8.3] [BE] Documentação para integradores (LLM agents consumidores)** · Fase: F2 · Est: M · Dep: 8.2

---

## EPIC 9 — QA, Testes & Demo

**Owner:** TODOS

### Issues

- **[9.1] [FE3+BE] Suite E2E Playwright: onboarding → criar contrato via IA → confirmar → execução simulada → ver recibo** · Fase: H · Est: G · Dep: 4.13, 5.8
- **[9.2] [BE] Smoke tests pós-deploy (health, criar contrato, execução em testnet)** · Fase: F1 · Est: M · Dep: 0.8
- **[9.3] [BE/SC] Load test: 1000 destinatários em 1 batch Soroban** · Fase: F1 · Est: G · Dep: 2.13
- **[9.4] [TODOS] Demo script hackathon: 5 min, persona editora + persona RH** · Fase: H · Est: M · Dep: 9.1
- **[9.5] [BE] Seed data: 5 contratos demo em testnet com dados realistas** · Fase: H · Est: M · Dep: 9.4
- **[9.6] [TODOS] Vídeo de apresentação (90s) + deck final** · Fase: H · Est: G · Dep: 9.4
- **[9.7] [BE+FE] README público + diagrama de arquitetura + instruções de setup** · Fase: H · Est: M · Dep: —
- **[9.8] [FE3] Lighthouse audit (Performance ≥ 90, A11y ≥ 95)** · Fase: F1 · Est: M · Dep: 5.14

---

## Cronograma sugerido (sprints de 1 semana)

### Sprint 0 — Setup (Semana 1, antes/início do hackathon)

| Papel | Foco |
|-------|------|
| BE/SC | 0.1–0.5, 0.7, 0.13, 0.16, 2.1 |
| FE1 | 0.15, 5.1, 5.2 (tokens) |
| FE2 | 4.10 com MSW (5.18) |
| FE3 | 5.2 (componentes), 5.3 (layout shell) |

### Sprint 1 — Hackathon entrega (Semana 2)

| Papel | Foco |
|-------|------|
| BE/SC | 2.5 simplificado, 2.12, 4.1, 4.3, 4.4, 4.6, 4.7, 3.6 |
| FE1 | 5.13, polimento, 9.4 |
| FE2 | 4.12, 4.13 |
| FE3 | 5.4 versão mock, 9.1, 9.7 |

**Entrega hackathon (9.1):** parsing IA + batch_pay refatorado + revisão humana + deploy testnet + demo.

### Sprints 2–4 — Pós-hackathon Fase 1 (semanas 3–6)

| Papel | Foco |
|-------|------|
| BE/SC | Epic 1 (1.1–1.8), 2.2–2.10, 3.2–3.13, 6.1–6.6 |
| FE1 | 1.9–1.14, 5.9–5.10, 6.7–6.9, 7.9 |
| FE2 | 4.5, 4.8, 4.11, 5.16 |
| FE3 | 5.4–5.8 com dados reais, 5.12, 5.13 |

### Sprints 5–6 — Fase 1 finalização (semanas 7–8)

| Papel | Foco |
|-------|------|
| BE/SC | 2.11, 2.13–2.14, 3.11–3.16, 7.1–7.6, 7.10 |
| FE1 | 7.9, polimento auth/settings |
| FE2 | 4.11 refinamento, 5.16 |
| FE3 | 5.14, 9.8, 9.1 expandido |

### Sprints 7–12 — Fase 2 (semanas 9–14)

| Papel | Foco |
|-------|------|
| BE/SC | 2.15–2.17 (auditoria + mainnet), 4.9, 6.10, 7.7–7.8, 8.1–8.3 |
| FE1 | Polimento + dark mode (5.17) |
| FE2 | 4.14, 4.15 |
| FE3 | 5.11, 5.15, 5.17 |

---

## Mitigação do bottleneck BE/SC

1. **MSW (5.18)** entrega contratos de API mockados desde o dia 1 → 3 FEs avançam em paralelo sem esperar BE.
2. **FE3 com SDK Stellar** (read-only): consegue ler saldos e listar contratos direto do Horizon sem depender de endpoint BE — descarrega BE.
3. **Consultoria Stellar Passkey pontual** sugerida para 1.1 (item de maior risco técnico).
4. **Auditoria externa do contrato** deve ser contratada com pelo menos 4 semanas de antecedência da mainnet.
5. **Smart contract freeze** após 2.13 — qualquer mudança após esse ponto exige nova auditoria.

---

## Convenção de import ClickUp

Cada bloco `[N.M] [Papel] Título` vira uma task. Sugestão de mapeamento:

| Campo ClickUp | Origem neste doc |
|---------------|------------------|
| Task Name | Título da issue |
| List | Nome do Epic |
| Tags | Papel (BE, FE1, FE2, FE3, SC) + Fase (H, F1, F2) |
| Priority | Derivada da sequência (caminho crítico = Urgent) |
| Time Estimate | P=4h, M=16h, G=32h, GG=64h |
| Dependencies | Campo "Dep:" |
| Description | (vazia — preencher na revisão) |

Posso gerar um CSV pronto para importar ao ClickUp se quiser, é só pedir.
