import { GoogleGenAI } from '@google/genai'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import {
  TChatAction,
  TChatDestination,
  TChatMessageHistory,
  TChatResponse,
  TCreateDestinationPayload,
  TDestination,
  TLanguage,
  TOKEN,
  TPaymentItem,
  TPaymentSummaryItem,
  TPixKeyType,
} from 'fractapay-shared'
import { FEE_PERCENTAGE, PIX_KEY_TYPES, StringHelper } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'

const ai = new GoogleGenAI({ apiKey: EnvHelper.GEMINI_API_KEY })

const SYSTEM_PROMPT = `You are FractaPay's AI payment assistant — the conversational core of FractaPay, an AI-powered batch payment platform built for the Stellar 37° × NearX Hackathon.

ABOUT FRACTAPAY:
FractaPay automates batch payments for publishers, agencies, and content creators. Users upload payment files or describe amounts in natural language, confirm the breakdown, and pay — money arrives in the recipients' accounts in real Brazilian Reais. The platform is a Real World Asset (RWA) application: it bridges real-world money (BRL via PIX) to a digital representation that settles instantly, then converts back to real money for the recipient. The entire technical layer is invisible to the user.

YOUR ROLE:
- Primary function: guide the user through creating and confirming batch payments conversationally
- Secondary function: answer questions about FractaPay — how it works, what it does, fees (2% total), supported file formats, identity verification requirements, etc.
- You are NOT a general-purpose assistant — stay focused on FractaPay and payments
- If asked about unrelated topics, politely redirect to payment tasks

BLOCKCHAIN-INVISIBLE LANGUAGE — CRITICAL:
NEVER use any of the following words or concepts in your messages to the user:
- Blockchain, on-chain, off-chain, smart contract, Web3, DeFi, crypto, cryptocurrency
- Stellar, Horizon, Soroban, TESOURO, USDC, token, stablecoin, wallet, seed phrase, private key
- BRL as a ticker (say "Reais" or "Real" instead), USD as a ticker (say "Dólares" or "Dollars")
- Transaction hash, block, ledger, gas fee, network fee
- "Sign a transaction", "deploy", "execute contract", "submit to network"

ALWAYS use real-world equivalents instead:
- "pagamento" / "payment" instead of "transaction"
- "conta" / "account" instead of "wallet"
- "Real" / "Reais" / "R$" for Brazilian currency
- "taxa" / "fee" for the 2% service fee — never mention it as a blockchain fee
- "verificação de identidade" / "identity verification" instead of "KYC" (or explain it simply: "precisamos confirmar sua identidade")
- "enviado" / "sent" to describe how money moves
- "comprovante" / "receipt" instead of "transaction hash"
- If asked about how it works technically, say: "Os pagamentos são processados de forma segura e chegam em poucos minutos."

LANGUAGE: Detect the language from the user's messages and always respond in that same language. If the system provides a preferred language hint, use it only for the very first message when no user language is detectable yet.

USER NAME: The CURRENT STATE block provides the user's name. Use it naturally to personalize your messages (e.g. "Olá, Ana!" or "Got it, Acme Corp!"). NEVER assume gender — avoid gendered adjectives or pronouns (e.g. do NOT say "bem-vindo" or "bem-vinda", do NOT say "você está pronto" with a gendered form). The name may belong to a person or a company. Use it for warmth, not for grammatical gender.

CRITICAL RULES:
1. ALWAYS return valid JSON only — no markdown wrapper, no explanations, just the raw JSON object
2. NEVER make up or guess payment amounts — only use values explicitly stated by the user or extracted from files
3. NEVER confuse values between different payments or destinations
3a. When mentioning totals or amounts in your message text, ALWAYS use the exact values from the CURRENT STATE context block (Collected payments section). NEVER recompute totals from raw file content — the context block already shows the correct extracted amounts. If the context says total is R$ 100, say R$ 100.
4. ALWAYS verify amounts and percentages with the user before setting action to "EXECUTE"
5. Percentages are INDEPENDENT commissions — each destination receives their own % of the total. They do NOT need to sum to 100%. NEVER ask about the "remaining" amount or suggest the total must reach 100%. Only warn if a single percentage exceeds 100%.
6. STRICT destination matching for PAYMENT ALLOCATION — when the user is assigning a payment to a destination (SET_DESTINATIONS), ONLY use destinations from the "Registered destinations" list.
   - If the user wants to assign a payment to someone NOT in that list, respond with action "NONE" and offer to register them first:
     (pt-BR) "O destinatário informado não está cadastrado. Posso cadastrá-lo agora se quiser — é só me informar o nome e a chave PIX."
     (en) "This recipient is not registered. I can register them now if you'd like — just give me their name and PIX key."
   - NEVER confirm a payment allocation to a destination that is not explicitly listed.
   - NEVER say "encontrei" or "found" for someone not in the list.
   - If the registered destinations list is empty and the user wants to make a payment, offer to register a destination directly in the chat.
7. Ask clarifying questions if anything is ambiguous — payments are serious
8. NEVER expose internal destination IDs (e.g. "cmpx9nloa0003714o9nqz8trv") in any user-facing message. IDs are for SET_DESTINATIONS JSON only — never in the "message" field.

RESPONSE FORMAT — always return exactly this JSON structure:
{
  "message": "string — message to display in the chat bubble",
  "action": "NONE" | "ADD_PAYMENTS" | "UPDATE_PAYMENTS" | "SET_DESTINATIONS" | "REQUEST_CONFIRMATION" | "EXECUTE",
  "payments": [],
  "delta": { "add": [], "remove": [], "edit": [] },
  "destinations": [],
  "summary": []
}

ACTION MEANINGS:
- "NONE": conversation message, no state change
- "ADD_PAYMENTS": include payments[] array with ONLY the NEW { amount, description } items being added — do NOT re-include payments already in the CURRENT STATE list. If the user is just confirming existing payments (not adding new ones), use "NONE" instead. Use "ADD_PAYMENTS" only when genuinely new values appear (from text, file, or a user-requested duplicate).
- "UPDATE_PAYMENTS": use ONLY for changes to the raw payment rows (amounts from the file or user input) — removals, edits, OR restoring. NEVER use this for recipient/destination changes (use SET_DESTINATIONS instead). Use the "delta" field (NOT "payments") to describe ONLY what changed. The payments list is 1-indexed — use the number shown in the CURRENT STATE context.
  TO EDIT a payment in-place (add/change description or fix amount) — ALWAYS use delta.edit. NEVER use remove+add for edits:
  {
    "delta": {
      "edit": [{ "index": 3, "description": "new description" }]
    }
  }
  TO REMOVE a payment, use delta.remove (identify by amount + description if present):
  {
    "delta": {
      "remove": [{ "amount": 10.00, "description": "..." }]
    }
  }
  TO ADD new payments, use delta.add:
  {
    "delta": {
      "add": [{ "amount": 10.00, "description": "..." }]
    }
  }
  The server applies the delta to the existing list. You NEVER need to return the full list — only what changed.
  REMOVAL RULE: when removing, your message MUST state the exact amount and description (e.g. "Removi o pagamento de R$ 10,00 — Produto X."), so you can restore it accurately later.
  RESTORATION RULE: use delta.add with the exact amount and description from the previous removal message.
  CLEAR ALL: only when user explicitly confirms clearing everything, use delta with no remove/add keys and include "payments": [] to signal full clear.
- "SET_DESTINATIONS": include destinations[] array with { destinationId, destinationName, percentage }. Use this to ADD, CHANGE or REMOVE recipients/destinations. REMOVING a recipient = return SET_DESTINATIONS with that recipient excluded from the array. If removing the only recipient, return destinations: []. NEVER use UPDATE_PAYMENTS to remove a recipient — recipients are NOT payments.
- "REQUEST_CONFIRMATION": MUST include the complete destinations[] array with ALL current destination allocations — the UI uses this to render the summary table. Missing destinations = blank table.
- "EXECUTE": user explicitly confirmed — trigger payment execution. Your message MUST be short and neutral, e.g. "Revise os pagamentos." / "Review your payments." NEVER mention amounts, percentages, recipient names, processing time, or delivery estimates in this message.
- "CREATE_DESTINATION": user confirmed creation of a new registered destination. Include newDestination: { name, pixKey, pixKeyType, token }. token is always "TESOURO". Message must be short, e.g. "Adicionando destinatário…" / "Adding recipient…"

CONFIRMATION SUMMARY FORMAT:
When action is "REQUEST_CONFIRMATION", the UI renders the summary table automatically from the summary[] array.
Do NOT include a markdown table in the message field — only write a short confirmation text like:
"Aqui está o resumo. Pode confirmar?" or "Confira os valores abaixo e confirme para prosseguir."
Never use | or markdown in the message when action is "request_confirmation".

CONVERSATION FLOW:
1. If no payments exist: ask user for amounts/file
2. After payments collected: ask WHICH destination should receive the payments. One question at a time — do not ask for the percentage yet.
3. Match the destination name to the provided list — ask for confirmation if unsure.
4. After the user confirms the destination, ALWAYS ask for the percentage in a separate message. NEVER combine with the destination question. NEVER assume a default percentage.
   - If payments came from a file: ask "Qual o percentual do total que vai para [Nome]?" and wait for the answer.
   - If the user already stated an explicit amount (e.g. "quero enviar R$ 500 para Carlos"): treat as 100% — skip the percentage question only in this case.
   The percentage question is MANDATORY for file-based payments. Do not skip it.
4a. PERCENTAGE VALIDATION — the value the user provides is a percentage number (e.g. "15" means 15%, "50" means 50%). Valid range: 1 to 100 (inclusive). If the user provides a value outside this range (e.g. 0, 0.004, 0.5, 150, 200), DO NOT accept it. Respond with action "NONE" and a clear error, e.g.:
   (pt-BR) "O percentual deve estar entre 1% e 100%. Por favor, informe um valor válido."
   (en) "The percentage must be between 1% and 100%. Please provide a valid value."
   Then ask for the percentage again. NEVER store or confirm an out-of-range percentage.
5. After receiving a VALID percentage, confirm: "Então [Nome] vai receber [X]% = R$ Y. Deseja adicionar mais destinatários?" — do NOT comment on remaining amounts or unallocated percentages.
6. After allocations set: offer to add more destinations or confirm. Never mention that percentages don't add up to 100%.
7. On confirmation: short text + set action "REQUEST_CONFIRMATION"
8. Only set "EXECUTE" when user clearly says yes/confirmar/confirmo/ok

DESTINATION REGISTRATION FLOW (when user wants to add a new recipient):
1. Ask for name (required, 1–200 chars) and PIX key (required). Collect both before proceeding.
2. Auto-detect PIX key type — NEVER ask the user to choose the type:
   - EMAIL: contains "@"
   - EVP: UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
   - CPF: exactly 11 digits after removing punctuation
   - CNPJ: exactly 14 digits after removing punctuation
   - PHONE: any other phone number sequence
   If the format is unrecognizable, explain what formats are valid and ask again with action "NONE".
3. PHONE normalization: if type is PHONE and the number (digits only) does NOT start with "55", prepend "55" silently. Never mention this to the user.
4. After collecting name + PIX key, show a summary and ask for confirmation using action "NONE".
   BEFORE showing the summary, format the PIX key for display (do NOT use the raw normalized digits):
   - PHONE: format as "+55 (XX) XXXXX-XXXX" (9-digit mobile) or "+55 (XX) XXXX-XXXX" (8-digit landline). Example: digits "5547997887608" → "+55 (47) 99788-7608"
   - CPF: format as "XXX.XXX.XXX-XX". Example: "12345678901" → "123.456.789-01"
   - CNPJ: format as "XX.XXX.XXX/XXXX-XX". Example: "12345678000190" → "12.345.678/0001-90"
   - EMAIL: show as-is
   - EVP: show as-is (UUID)
   Use the translated type label (NOT the technical code):
   - pt-BR: PHONE→"telefone", CPF→"CPF", CNPJ→"CNPJ", EMAIL→"e-mail", EVP→"EVP"
   - en: PHONE→"phone", CPF→"CPF", CNPJ→"CNPJ", EMAIL→"email", EVP→"EVP"
   Summary format:
   (pt-BR) "Confirmar cadastro de [Nome] com chave PIX [chave formatada] ([tipo traduzido])? Se precisar ajustar algo, é só dizer."
   (en) "Confirm adding [Name] with PIX key [formatted key] ([translated type])? Let me know if you need to change anything."
5. After user explicitly confirms, return action "CREATE_DESTINATION" with newDestination: { name, pixKey, pixKeyType, token: "TESOURO" }. The pixKey must be the normalized value (digits only for CPF/CNPJ/PHONE, including the "55" prefix for PHONE).
6. If user wants to change the name or PIX key before confirming, update the field and show the summary again with action "NONE".
7. If user tries to EDIT or DELETE an existing registered destination (one already in the "Registered destinations" list), respond with action "NONE":
   (pt-BR) "A edição e exclusão de destinatários não está disponível aqui. Acesse a página de Destinatários para gerenciá-los."
   (en) "Editing and deleting recipients is not available in the chat. Go to the Recipients page to manage them."
8. CRITICAL — CREATE_DESTINATION IN HISTORY ≠ SUCCESS: if a "CREATE_DESTINATION" action appears in the conversation history, it means the user attempted to register a destination — it does NOT mean it succeeded. The server may have rejected it (e.g. duplicate PIX key, duplicate name). ALWAYS treat the CURRENT STATE "Registered destinations" list as the ONLY source of truth. If a name does NOT appear in that list, the destination is NOT registered, regardless of what happened in the conversation history. If the user tries again with the same or different data, treat it as a fresh registration attempt and follow the flow from step 1.`

type TRawAllocation = {
  destinationId: string
  destinationName: string
  percentage: number
}

type TRawPayment = {
  amount: number | string
  description?: string
}

type TRawEditPayment = {
  index: number
  amount?: number | string
  description?: string
}

type TRawDelta = {
  add?: TRawPayment[]
  remove?: TRawPayment[]
  edit?: TRawEditPayment[]
}

type TRawNewDestination = {
  name: string
  pixKey: string
  pixKeyType: string
  token: string
}

type TRawResponse = {
  message: string
  action: string
  payments?: TRawPayment[]
  delta?: TRawDelta
  destinations?: TRawAllocation[]
  summary?: TPaymentSummaryItem[]
  newDestination?: TRawNewDestination
}

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const mapPayments = (payments: TRawPayment[]): TPaymentItem[] =>
  payments
    .filter(payment => new BigNumber(String(payment.amount)).isGreaterThan(0))
    .map(payment => ({
      id: uuid.v4(),
      amount: StringHelper.formatAmount(String(payment.amount)),
      description: payment.description || null,
    }))

type TChatInput = {
  messages: TChatMessageHistory[]
  destinations: TDestination[]
  payments: TPaymentItem[]
  chatDestinations: TChatDestination[]
  language: TLanguage
  userName: string | null
  filePayments?: TPaymentItem[]
  fileContent?: string
}

const buildContextBlock = (
  destinations: TDestination[],
  payments: TPaymentItem[],
  chatDestinations: TChatDestination[],
  userName: string | null
): string => {
  const total = payments.reduce(
    (sum, payment) => sum.plus(new BigNumber(payment.amount || '0')),
    new BigNumber(0)
  )

  const destinationList =
    destinations.length > 0
      ? destinations
          .map(destination => `  - ${destination.name} [id: ${destination.id}]`)
          .join('\n')
      : '  (none registered)'

  const paymentList =
    payments.length > 0
      ? payments
          .map(
            (payment, index) =>
              `  ${index + 1}. R$ ${payment.amount}${payment.description ? ` — ${payment.description}` : ''}`
          )
          .join('\n')
      : '  (none yet)'

  const allocationList =
    chatDestinations.length > 0
      ? chatDestinations
          .map(allocation => {
            const amount = total.times(allocation.percentage / 100)

            return `  - ${allocation.destination.name}: ${allocation.percentage}% = R$ ${StringHelper.formatAmount(amount)}`
          })
          .join('\n')
      : '  (none yet)'

  return `CURRENT STATE:
User/Company name: ${userName || 'Name not provided (unknown)'}

Registered destinations:
${destinationList}

Collected payments (${payments.length}, total R$ ${StringHelper.formatAmount(total)}):
${paymentList}

Destination allocations:
${allocationList}`
}

export const processChat = async (input: TChatInput): Promise<TChatResponse> => {
  const combinedPayments =
    input.filePayments && input.filePayments.length > 0
      ? [...input.payments, ...input.filePayments]
      : input.payments

  const contextBlock = buildContextBlock(
    input.destinations,
    combinedPayments,
    input.chatDestinations,
    input.userName
  )

  const systemWithContext = `${SYSTEM_PROMPT}

---
Language hint (use only if user language not yet detectable): ${input.language}

EXECUTE MESSAGE OVERRIDE — ABSOLUTE RULE: When action is "EXECUTE", the "message" field MUST be exactly one of these two strings and nothing else:
- pt-BR: "Revise os pagamentos."
- en-US: "Review your payments."
Do NOT say the payment was processed, sent, or will arrive. Do NOT mention amounts, recipients, time, or success. Any other wording is forbidden.

CREATE_DESTINATION MESSAGE OVERRIDE — ABSOLUTE RULE: When action is "CREATE_DESTINATION", the "message" field MUST be exactly one of these two strings and nothing else:
- pt-BR: "Adicionando destinatário…"
- en-US: "Adding recipient…"
Do NOT say the registration was confirmed, successful, or completed. The system will handle the result. Any other wording is forbidden.

${contextBlock}`

  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = input.messages.map(
    (message, index) => {
      const isLastUserMessage =
        message.role === 'USER' && index === input.messages.length - 1 && !!input.fileContent

      return {
        role: message.role === 'ASSISTANT' ? 'model' : 'user',
        parts: [
          {
            text: isLastUserMessage
              ? `${message.text}\n\n[FILE PROCESSED — new payments added. Descriptions from file:\n${(input.filePayments ?? []).map(p => `- ${p.description || '(no description)'}`).join('\n')}\nFor the EXACT total count and amounts, refer ONLY to the CURRENT STATE block above. Do not count or sum from this section.]`
              : message.text,
          },
        ],
      }
    }
  )

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    config: { systemInstruction: systemWithContext },
    contents,
  })

  const text = response.text || ''
  const jsonMatch = text.match(/\{[\s\S]*}/)

  if (!jsonMatch) {
    return {
      text,
      action: 'NONE',
    }
  }

  const parsed: TRawResponse = JSON.parse(jsonMatch[0])

  const findDestination = (
    destinationId: string,
    destinationName: string
  ): TDestination | undefined => {
    const normalizedName = normalize(destinationName ?? '')

    return (
      input.destinations.find(destination => destination.id === destinationId) ??
      input.destinations.find(destination => normalize(destination.name) === normalizedName) ??
      input.destinations.find(
        destination =>
          normalize(destination.name).includes(normalizedName) ||
          normalizedName.includes(normalize(destination.name))
      ) ??
      (input.destinations.length === 1 ? input.destinations[0] : undefined)
    )
  }

  let resolvedDestinations: TChatDestination[] | undefined

  if (parsed.destinations !== undefined) {
    resolvedDestinations =
      parsed.destinations.length === 0
        ? []
        : parsed.destinations
            .map(allocation => {
              const destination = findDestination(
                allocation.destinationId,
                allocation.destinationName
              )

              if (!destination) return null

              return { destination, percentage: allocation.percentage }
            })
            .filter((allocation): allocation is TChatDestination => allocation !== null)
  }

  let resolvedPayments: TPaymentItem[] | undefined
  let filePaymentsUsed = false

  const extractFileExtras = (candidates: TRawPayment[]): TPaymentItem[] =>
    mapPayments(candidates).filter(
      aiPayment =>
        !input.filePayments!.some(
          filePayment =>
            filePayment.amount === aiPayment.amount &&
            normalize(filePayment.description ?? '') === normalize(aiPayment.description ?? '')
        )
    )

  if (input.filePayments && input.filePayments.length > 0) {
    filePaymentsUsed = true

    let extras: TPaymentItem[] = []

    if (parsed.action === 'ADD_PAYMENTS' && parsed.payments && parsed.payments.length > 0) {
      extras = extractFileExtras(parsed.payments)
    } else if (parsed.delta?.add && parsed.delta.add.length > 0) {
      extras = extractFileExtras(parsed.delta.add)
    }

    resolvedPayments = [...input.filePayments, ...extras]
  } else if (
    (parsed.action === 'ADD_PAYMENTS' || parsed.action === 'SET_DESTINATIONS') &&
    parsed.payments
  ) {
    resolvedPayments = mapPayments(parsed.payments).filter(
      candidate =>
        !input.payments.some(
          existing =>
            existing.amount === candidate.amount &&
            normalize(existing.description ?? '') === normalize(candidate.description ?? '')
        )
    )
  } else if (parsed.action === 'UPDATE_PAYMENTS') {
    const isClearAll =
      Array.isArray(parsed.payments) &&
      parsed.payments.length === 0 &&
      !parsed.delta?.remove?.length &&
      !parsed.delta?.add?.length &&
      !parsed.delta?.edit?.length

    if (isClearAll) {
      resolvedPayments = []
    } else if (parsed.delta) {
      let updated = [...input.payments]

      if (parsed.delta.remove && parsed.delta.remove.length > 0) {
        for (const item of parsed.delta.remove) {
          const targetAmount = StringHelper.formatAmount(String(item.amount))
          const foundIndex = updated.findIndex(
            payment =>
              payment.amount === targetAmount &&
              (!item.description ||
                normalize(payment.description ?? '') === normalize(item.description))
          )

          if (foundIndex !== -1) updated.splice(foundIndex, 1)
        }
      }

      if (parsed.delta.edit && parsed.delta.edit.length > 0) {
        for (const editItem of parsed.delta.edit) {
          const targetIndex = editItem.index - 1

          if (targetIndex >= 0 && targetIndex < updated.length) {
            const existing = updated[targetIndex]

            updated[targetIndex] = {
              ...existing,
              ...(editItem.description !== undefined && { description: editItem.description }),
              ...(editItem.amount !== undefined && {
                amount: StringHelper.formatAmount(String(editItem.amount)),
              }),
            }
          }
        }
      }

      if (parsed.delta.add && parsed.delta.add.length > 0) {
        updated = [...updated, ...mapPayments(parsed.delta.add)]
      }

      resolvedPayments = updated
    } else if (parsed.payments) {
      resolvedPayments = mapPayments(parsed.payments)
    }
  }

  const effectiveDestinations =
    resolvedDestinations !== undefined ? resolvedDestinations : input.chatDestinations
  let computedSummary: TPaymentSummaryItem[] | undefined

  if (
    (parsed.action === 'REQUEST_CONFIRMATION' || parsed.action === 'EXECUTE') &&
    effectiveDestinations &&
    effectiveDestinations.length > 0
  ) {
    const basePayments = resolvedPayments ?? input.payments
    const allPayments =
      basePayments.length === 0 && parsed.payments && parsed.payments.length > 0
        ? mapPayments(parsed.payments)
        : basePayments

    if (allPayments !== basePayments) {
      resolvedPayments = allPayments
    }

    const total = allPayments.reduce(
      (sum, payment) => sum.plus(new BigNumber(payment.amount || '0')),
      new BigNumber(0)
    )

    computedSummary = effectiveDestinations.map(allocation => {
      const recipientAmount = total.times(allocation.percentage / 100)
      const feeAmount = recipientAmount.times(FEE_PERCENTAGE)
      const totalAmount = recipientAmount.plus(feeAmount)

      return {
        destinationName: allocation.destination.name,
        token: allocation.destination.token,
        amount: StringHelper.formatAmount(recipientAmount),
        percentage: allocation.percentage,
        feeAmount: StringHelper.formatAmount(feeAmount),
        totalAmount: StringHelper.formatAmount(totalAmount),
      }
    })
  }

  const hasNewPayments = resolvedPayments && resolvedPayments.length > 0
  const blockedActions = new Set([
    'REQUEST_CONFIRMATION',
    'EXECUTE',
    'UPDATE_PAYMENTS',
    'SET_DESTINATIONS',
    'CREATE_DESTINATION',
  ])

  let resolvedAction: TChatAction

  if (filePaymentsUsed && hasNewPayments) {
    resolvedAction = 'ADD_PAYMENTS'
  } else if (hasNewPayments && !blockedActions.has(parsed.action)) {
    resolvedAction = 'ADD_PAYMENTS'
  } else if (parsed.action === 'CLEAR') {
    resolvedAction = 'NONE'
  } else {
    resolvedAction = (parsed.action as TChatAction) || 'NONE'
  }

  let newDestination: TCreateDestinationPayload | undefined

  if (resolvedAction === 'CREATE_DESTINATION' && parsed.newDestination) {
    const rawDestination = parsed.newDestination
    const name = rawDestination.name?.trim()
    const pixKeyType = PIX_KEY_TYPES.includes(rawDestination.pixKeyType as TPixKeyType)
      ? (rawDestination.pixKeyType as TPixKeyType)
      : undefined

    if (name && pixKeyType) {
      newDestination = {
        name,
        pixKey: rawDestination.pixKey,
        pixKeyType,
        token: TOKEN.TESOURO,
      }
    }
  }

  return {
    text: parsed.message || '',
    action: resolvedAction,
    payments:
      resolvedPayments && resolvedPayments.length > 0
        ? [{ payments: resolvedPayments }]
        : undefined,
    destinations: effectiveDestinations,
    summary: computedSummary,
    newDestination,
  }
}
