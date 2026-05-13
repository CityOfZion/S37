# FractaPay — Design System & Princípios de UX

> **Tom:** fintech moderno brasileiro (referências: Nubank, Mercado Pago, PicPay, Wise)
> **Plataforma:** web responsiva mobile-first (375px → 1440px)
> **Princípio mestre:** o usuário nunca precisa saber que existe blockchain

---

## 1. Princípios de design "Blockchain-Invisible"

### 1.1 Vocabulário substituído

| Termo cripto (NÃO usar) | Substituto FractaPay (USAR) |
|--------------------------|-------------------------------|
| Carteira / Wallet | **Conta** (sua conta FractaPay) |
| Endereço Stellar | **Identificador da conta** (ou esconder por completo) |
| Chave privada / Seed phrase | **Chave de acesso** (passkey, biometria) |
| Stablecoin / USDC | **Saldo** (mostrado em R$ por padrão) |
| Smart contract / Soroban | **Regra de pagamento** ou simplesmente "Contrato" |
| Balde (interno do PDD) | **Caixa do contrato** (ou "Saldo do contrato") |
| Transaction hash | **Comprovante** (com link "ver no explorer" escondido em "Detalhes técnicos") |
| Gas fee | (ocultar — taxa é absorvida pela 1,5%) |
| On-chain / off-chain | (nunca aparece para o usuário) |
| Testnet / Mainnet | (nunca aparece para o usuário) |

### 1.2 Princípios

1. **Real é a moeda padrão.** Toda exibição de valor é em R$, com USDC apenas em "Detalhes técnicos" do recibo, opcional.
2. **Tempo humano, não tempo blockchain.** "Pago em 12 de maio às 14h32" — nunca "block 47291038".
3. **Progressive disclosure radical.** Tudo que é blockchain (endereço, hash, fee on-chain) fica em accordion fechado por padrão, rotulado "Detalhes técnicos / Para auditoria".
4. **Linguagem operacional.** "Distribuir pagamentos", "Próxima execução", "Pausar regra" — nada de "deploy", "execute contract", "submit transaction".
5. **Feedback de tempo claro.** "Enviado via PIX. Chega em até 10 minutos." em vez de "Transaction submitted to Horizon".
6. **Confirmação humana antes de qualquer commit irreversível.** Tela de revisão obrigatória; o usuário aprova antes do agente IA tocar em qualquer coisa on-chain.
7. **Auditabilidade como benefício, não como jargão.** "Cada pagamento gera um comprovante público que qualquer destinatário pode verificar sozinho" — sem mencionar imutabilidade ou blockchain.

### 1.3 Tom de voz

- **Português brasileiro coloquial-profissional.** "Vamos lá", "Tudo certo!", "Vai sair do ar?" — mas evitar gírias regionais.
- **Direto e curto.** Sem rodeios, sem jargão financeiro pesado.
- **Empático no erro.** "Algo deu errado por aqui — não foi culpa sua. Já vamos resolver."
- **Celebratório nos sucessos.** "Pronto! 8 pagamentos saíram da sua caixa."

---

## 2. Identidade Visual

### 2.1 Logo (conceito)

Marca: **FractaPay**
Símbolo: três círculos conectados formando um triângulo (representa a fração / distribuição). O círculo central em violeta, os dois inferiores em mint, conectados por linhas finas (representando os pagamentos fluindo). Versão monocromática disponível.

### 2.2 Paleta de cores

#### Cor primária — Violeta elétrico

| Token | Hex | Uso |
|-------|-----|-----|
| `--brand-50` | `#F3EFFF` | Backgrounds suaves, hover de itens primários |
| `--brand-100` | `#E4DAFF` | Surface accent, badges |
| `--brand-200` | `#C9B5FF` | Bordas accent |
| `--brand-300` | `#A988FF` | Disabled primary |
| `--brand-400` | `#8A60FF` | Hover de botão primary |
| `--brand-500` | `#7B61FF` | **Primary — botões, links, CTAs** |
| `--brand-600` | `#6244E0` | Active state |
| `--brand-700` | `#4D33B5` | Texto sobre brand-100 |
| `--brand-800` | `#3A2587` | Headings em surface accent |
| `--brand-900` | `#1F1153` | Texto principal sobre dark |

#### Cor secundária — Mint (sucesso, fluxo de dinheiro)

| Token | Hex | Uso |
|-------|-----|-----|
| `--accent-50` | `#E6FBF5` | Background success suave |
| `--accent-100` | `#C0F3E2` | Badge success |
| `--accent-400` | `#2AD9A8` | Ícones de status "pago" |
| `--accent-500` | `#00C9A7` | **Botão CTA secundário, status success** |
| `--accent-600` | `#00A085` | Hover/active success |
| `--accent-900` | `#003D33` | Texto sobre accent-100 |

#### Neutros — Cool grays

| Token | Hex | Uso |
|-------|-----|-----|
| `--neutral-0` | `#FFFFFF` | Surface |
| `--neutral-50` | `#F8F7FB` | **App background** (com leve hint violeta) |
| `--neutral-100` | `#EFEDF5` | Surface alt, hover de linha |
| `--neutral-200` | `#E0DCEC` | Borders |
| `--neutral-300` | `#C4BFD4` | Disabled border |
| `--neutral-400` | `#9690AE` | Placeholder text |
| `--neutral-500` | `#6E6884` | **Text muted** |
| `--neutral-700` | `#3F3954` | **Text body** |
| `--neutral-900` | `#1A1832` | **Text primary**, dark surface |
| `--neutral-1000` | `#0E0C20` | Dark mode background |

#### Semânticos

| Token | Hex | Uso |
|-------|-----|-----|
| `--success-500` | `#00C9A7` | (alias de accent-500) |
| `--warning-500` | `#FFB020` | Pausado, atenção |
| `--warning-100` | `#FFF1D6` | Badge warning |
| `--danger-500` | `#FF4D4F` | Erro, encerrado |
| `--danger-100` | `#FFE3E3` | Badge danger |
| `--info-500` | `#3CA7FF` | Info, links secundários |
| `--info-100` | `#DDF0FF` | Badge info |

#### Gradientes (uso pontual)

```css
--gradient-brand: linear-gradient(135deg, #7B61FF 0%, #B388FF 100%);
--gradient-mint:  linear-gradient(135deg, #00C9A7 0%, #57E5BD 100%);
--gradient-hero:  linear-gradient(135deg, #7B61FF 0%, #00C9A7 100%);
```

### 2.3 Tipografia

**Família principal:** Manrope (Google Fonts, weights 400/500/600/700/800) — fintech-friendly, neutra, ótima legibilidade em mobile.
**Família mono:** JetBrains Mono — apenas para valores monetários grandes e código.

| Token | Tamanho | Line-height | Weight | Uso |
|-------|---------|-------------|--------|-----|
| `--text-display` | 40px (mobile: 32px) | 1.1 | 800 | Hero, valor principal |
| `--text-h1` | 32px (mobile: 24px) | 1.2 | 700 | Título de página |
| `--text-h2` | 24px (mobile: 20px) | 1.25 | 700 | Seções |
| `--text-h3` | 20px | 1.3 | 600 | Cards, modais |
| `--text-h4` | 16px | 1.4 | 600 | Subseções |
| `--text-body-lg` | 16px | 1.5 | 400 | Body grande |
| `--text-body` | 14px | 1.5 | 400 | **Body padrão** |
| `--text-body-sm` | 13px | 1.45 | 400 | Body pequeno |
| `--text-caption` | 12px | 1.4 | 500 | Metadados |
| `--text-overline` | 11px | 1.3 | 700 | Tags, eyebrows (uppercase + tracking) |

### 2.4 Spacing scale (4px base)

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
```

### 2.5 Border radius

```
--radius-sm: 8px   (badges, inputs pequenos)
--radius-md: 12px  (inputs padrão, botões)
--radius-lg: 16px  (cards)
--radius-xl: 24px  (modais, drawers)
--radius-pill: 999px (avatars, badges arredondados)
```

### 2.6 Sombras

```
--shadow-sm:    0 1px 2px rgba(26, 24, 50, 0.06)
--shadow-md:    0 4px 12px rgba(26, 24, 50, 0.08)
--shadow-lg:    0 12px 28px rgba(26, 24, 50, 0.12)
--shadow-brand: 0 8px 24px rgba(123, 97, 255, 0.28)
```

### 2.7 Iconografia

**Lucide Icons** (open-source, consistente). Tamanho padrão 20px no body, 24px em headers, 16px em badges. Stroke-width 1.75.

---

## 3. Componentes

### 3.1 Button

| Variante | Background | Text | Borda | Uso |
|----------|------------|------|-------|-----|
| `primary` | `--brand-500` | white | none | CTA principal |
| `secondary` | `--neutral-0` | `--brand-500` | `--brand-200` (1px) | Ações secundárias |
| `tertiary` | transparent | `--brand-500` | none | Links de ação |
| `success` | `--accent-500` | white | none | Confirmar pagamento |
| `danger` | `--danger-500` | white | none | Excluir, encerrar |
| `ghost` | transparent | `--neutral-700` | none | Ações neutras |

Tamanhos: `sm` (32px altura), `md` (44px — padrão mobile-first), `lg` (52px — hero).
Estados: hover, active, focus (anel 2px brand-300), disabled (opacity 40%), loading (spinner + texto).

### 3.2 Input / Form fields

- Altura 44px (toque-friendly mobile)
- Border 1px `--neutral-200`, focus 2px `--brand-500`
- Label flutuante OU label fixa acima (padrão fixa para clareza)
- Helper text 12px abaixo
- Error: borda `--danger-500`, texto erro abaixo
- Ícone à direita opcional (info, validação)

### 3.3 Card

- Surface `--neutral-0`, radius `--lg`, shadow `--shadow-sm`
- Padding `--space-5` (20px) em mobile, `--space-6` (24px) em desktop
- Hover (interativo): `--shadow-md`

### 3.4 Badge / Status pill

| Estado | Bg | Text | Ícone |
|--------|-----|------|-------|
| Ativo | `--accent-100` | `--accent-900` | check-circle |
| Pausado | `--warning-100` | `#7A5200` | pause-circle |
| Encerrado | `--neutral-100` | `--neutral-700` | square |
| Erro | `--danger-100` | `#7A0E10` | alert-circle |
| Processando | `--info-100` | `#0B4F8A` | loader (animado) |

### 3.5 Bottom navigation (mobile)

- 4 itens: Home, Contratos, Chat (CTA destacado), Recibos, Mais
- O CTA central (Chat IA) é maior e elevado, com `--gradient-brand`, ícone sparkles, raio total
- Altura 64px + safe-area

### 3.6 Chat bubbles

- Usuário: bg `--brand-500`, texto branco, radius 16px (canto inferior-direito 4px), alinhado à direita
- Agente: bg `--neutral-100`, texto `--neutral-900`, radius 16px (canto inferior-esquerdo 4px), alinhado à esquerda
- Anexos: card branco dentro da bolha com ícone do tipo de arquivo + nome + tamanho
- Timestamp `--text-caption` em `--neutral-400` abaixo

---

## 4. Padrões de UX

### 4.1 Estados sistemáticos por tela

Toda tela deve definir:
- **Loading state** (skeleton, não spinner cheio)
- **Empty state** (ilustração + CTA claro)
- **Error state** (mensagem + retry + suporte)
- **Success state** (toast + redirecionamento opcional)

### 4.2 Microcopy de criação de conta

```
Bem-vindo ao FractaPay 👋

Vamos te criar uma conta segura em 30 segundos.
Sua chave de acesso fica protegida no seu dispositivo —
nem nós conseguimos acessar.

[Continuar com Google]
[Usar biometria do dispositivo]
```

Nunca mencionar "wallet", "Stellar", "passkey" (termo técnico). Usar "chave de acesso" / "biometria".

### 4.3 Microcopy de execução

**Antes:**
> "Pronto para distribuir R$ 12.450 entre 8 destinatários no dia 5/06 às 09h."

**Durante:**
> "Distribuindo pagamentos… isso leva alguns segundos."

**Depois:**
> "Tudo certo! ✓ 8 pagamentos enviados. Cada destinatário recebe via PIX em até 10 minutos."

### 4.4 Recibo (a parte mais delicada)

Estrutura:
1. **Header amigável:** "R$ 1.245,00 enviado para Maria Souza"
2. **Detalhes em linguagem humana:** Data, hora, contrato de origem, status PIX
3. **Botão "Compartilhar comprovante"** (gera PDF)
4. **Accordion fechado: "Detalhes técnicos / auditoria"** — só aí aparece hash da transação, link Stellar Explorer, endereço de origem

### 4.5 Confirmação humana antes de commit

Quando o agente IA propõe um contrato:
1. Tela cheia com **revisão tabular** (destinatário, regra, valor, periodicidade)
2. Banner amarelo no topo: "Revise atentamente. Após confirmar, esta regra ficará ativa."
3. Cada linha é editável inline
4. Footer fixo com botões "Voltar ao chat" / "Confirmar e ativar"
5. Modal de dupla confirmação: "Tudo certo com essas 8 regras? Vou ativar agora."

### 4.6 Loading invisível na primeira sessão

Quando a smart wallet está sendo provisionada (passkey + Stellar):
```
Preparando sua conta…
Isso leva uns 10 segundos. Pode aguardar — vai valer a pena. ✨
[barra de progresso animada]
```

**Nunca** mostrar "Creating Stellar smart wallet via Passkey Kit".

---

## 5. Acessibilidade (WCAG AA)

- Contraste mínimo 4.5:1 para texto body, 3:1 para texto grande
- Foco visível em todos elementos interativos (anel 2px `--brand-500` + 2px offset)
- Touch targets ≥ 44×44px
- Suporte completo a navegação por teclado
- ARIA labels em todos ícones-botão
- `prefers-reduced-motion` respeitado em animações
- Suporte a screen reader em valores monetários (`aria-label="mil duzentos e quarenta e cinco reais"`)

---

## 6. Responsividade

Breakpoints Tailwind padrão:

| Bp | Largura | Layout |
|----|---------|--------|
| (default) | < 640px | Mobile: bottom nav, conteúdo single-column |
| `sm` | ≥ 640px | Mobile L: ainda single column, mais respiro |
| `md` | ≥ 768px | Tablet: sidebar colapsável, 2 colunas em listas |
| `lg` | ≥ 1024px | Desktop: sidebar fixa, 3 colunas em dashboard |
| `xl` | ≥ 1280px | Desktop L: max-width 1280px centralizado |

Mobile-first: todo CSS sem prefixo é mobile; usa-se `md:` e `lg:` para upgrades.

---

## 7. Animações & microinterações

- Transição padrão: `150ms ease-out` em hover/focus
- Page transitions: fade + slide-up 24px em 200ms
- Skeleton shimmer: 1.5s loop em `--neutral-100` → `--neutral-50` → `--neutral-100`
- Confirmação de pagamento: confete sutil em verde-mint, 800ms
- Chat: "typing dots" do agente com 3 bolinhas em wave
- Pull-to-refresh em listas mobile (nativo via overscroll)

---

## 8. Tokens prontos para Tailwind config

```js
// tailwind.config.js (excerpt)
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F3EFFF', 100: '#E4DAFF', 200: '#C9B5FF', 300: '#A988FF',
          400: '#8A60FF', 500: '#7B61FF', 600: '#6244E0', 700: '#4D33B5',
          800: '#3A2587', 900: '#1F1153',
        },
        accent: {
          50: '#E6FBF5', 100: '#C0F3E2', 400: '#2AD9A8',
          500: '#00C9A7', 600: '#00A085', 900: '#003D33',
        },
        neutral: {
          0: '#FFFFFF', 50: '#F8F7FB', 100: '#EFEDF5', 200: '#E0DCEC',
          300: '#C4BFD4', 400: '#9690AE', 500: '#6E6884', 700: '#3F3954',
          900: '#1A1832', 1000: '#0E0C20',
        },
        warning: { 100: '#FFF1D6', 500: '#FFB020' },
        danger:  { 100: '#FFE3E3', 500: '#FF4D4F' },
        info:    { 100: '#DDF0FF', 500: '#3CA7FF' },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '24px', pill: '999px' },
      boxShadow: {
        sm:    '0 1px 2px rgba(26, 24, 50, 0.06)',
        md:    '0 4px 12px rgba(26, 24, 50, 0.08)',
        lg:    '0 12px 28px rgba(26, 24, 50, 0.12)',
        brand: '0 8px 24px rgba(123, 97, 255, 0.28)',
      },
    },
  },
};
```

---

## 9. Referências e benchmarks de UX

| App | Inspiração para FractaPay |
|-----|----------------------------|
| **Nubank** | Onboarding sem fricção, paleta vibrante, tom acolhedor |
| **Mercado Pago** | Mostrar saldo + ações rápidas em hero, recibos públicos compartilháveis |
| **Wise** | Como mostrar "money in motion" (tracking de transferência clara) |
| **PicPay** | Bottom nav + CTA central elevado |
| **Cash App** | Simplicidade radical, esconder toda complexidade técnica |
| **Stripe Dashboard** | Tabelas densas com hierarquia clara para o lado B2B |
| **Linear** | Atalhos de teclado e command-K em desktop |

---

## 10. O que NÃO fazer

- ❌ Mostrar "Connect Wallet" em qualquer lugar
- ❌ Mostrar endereços Stellar (G...) em telas principais
- ❌ Usar palavras "crypto", "blockchain", "Web3", "DeFi"
- ❌ Mostrar saldo em USDC como número primário
- ❌ Pedir ao usuário para "assinar uma transação" (palavras: "confirmar pagamento")
- ❌ Mostrar gas fees separadamente (taxa única 1,5% transparente, fim)
- ❌ Mostrar barra de progresso de confirmações de bloco
- ❌ Vocabulário técnico de smart contract ("deploy", "execute")
