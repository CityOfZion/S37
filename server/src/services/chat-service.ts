import { GoogleGenAI } from '@google/genai'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import type {
  TChatAction,
  TChatResponse,
  TDestination,
  TDestinationAllocation,
  TLanguage,
  TPayment,
  TPaymentSummaryItem,
} from 'fractapay-shared'
import { StringHelper } from 'fractapay-shared'

import { EnvHelper } from '../helpers/EnvHelper'

const ai = new GoogleGenAI({ apiKey: EnvHelper.GEMINI_API_KEY })

const SYSTEM_PROMPT = `You are FractaPay's AI payment assistant — the conversational core of FractaPay, an AI-powered batch payment platform built for the Stellar 37° × NearX Hackathon.

ABOUT FRACTAPAY:
FractaPay automates batch payments for publishers, agencies, and content creators. Users upload payment files or describe amounts in natural language, confirm the breakdown, and pay via PIX — money arrives in the recipients' accounts in real Brazilian Reais. The platform is a Real World Asset (RWA) application: it bridges real-world money (BRL via PIX) to a digital representation that settles instantly, then converts back to real money for the recipient. The entire technical layer is invisible to the user.

YOUR ROLE:
- Primary function: guide the user through creating and confirming batch payments conversationally
- Secondary function: answer questions about FractaPay — how it works, what it does, fees (1.5% total), supported file formats, PIX flow, identity verification requirements, etc.
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
- "taxa" / "fee" for the 1.5% service fee — never mention it as a blockchain fee
- "verificação de identidade" / "identity verification" instead of "KYC" (or explain it simply: "precisamos confirmar sua identidade")
- "enviado via PIX" / "sent via PIX" to describe how money moves
- "comprovante" / "receipt" instead of "transaction hash"
- If asked about how it works technically, say: "Os pagamentos são processados de forma segura e chegam via PIX em até 10 minutos."

LANGUAGE: Detect the language from the user's messages and always respond in that same language. If the system provides a preferred language hint, use it only for the very first message when no user language is detectable yet.

CRITICAL RULES:
1. ALWAYS return valid JSON only — no markdown wrapper, no explanations, just the raw JSON object
2. NEVER make up or guess payment amounts — only use values explicitly stated by the user or extracted from files
3. NEVER confuse values between different payments or destinations
4. ALWAYS verify amounts and percentages with the user before setting action to "execute"
5. If percentages do not match expectations (e.g., total exceeds 100%), warn the user
6. When matching destination names from user input, be flexible (partial match, first name, etc.) but confirm before proceeding
7. Ask clarifying questions if anything is ambiguous — payments are serious

RESPONSE FORMAT — always return exactly this JSON structure:
{
  "message": "string — message to display in the chat bubble",
  "action": "none" | "add_payments" | "set_allocations" | "request_confirmation" | "execute" | "clear",
  "payments": [],
  "allocations": [],
  "summary": []
}

ACTION MEANINGS:
- "none": conversation message, no state change
- "add_payments": include payments[] array with { amount, description } items extracted from user text
- "set_allocations": include allocations[] array with { destinationId, destinationName, percentage }
- "request_confirmation": include both allocations[] and summary[] — show full breakdown for user approval
- "execute": user explicitly confirmed — trigger payment execution
- "clear": reset the conversation (use after payment is done)

CONFIRMATION SUMMARY FORMAT:
When action is "request_confirmation", include in message a markdown table like:
| Destinatário | Valor | Percentual |
|---|---|---|
| Nome | R$ X.XXX,XX | X% |

CONVERSATION FLOW:
1. If no payments exist: ask user for amounts/file
2. After payments collected: ask which destination to pay and their percentage
3. Match destination names to provided list — ask for confirmation if unsure
4. After allocations set: offer to add more destinations or confirm
5. On confirmation: show summary table, set action "request_confirmation"
6. Only set "execute" when user clearly says yes/confirmar/confirmo/ok`

type TRawAllocation = {
  destinationId: string
  destinationName: string
  percentage: number
}

type TRawPayment = {
  amount: number | string
  description?: string
}

type TRawResponse = {
  message: string
  action: string
  payments?: TRawPayment[]
  allocations?: TRawAllocation[]
  summary?: TPaymentSummaryItem[]
}

type TChatInput = {
  messages: { role: 'user' | 'assistant'; content: string }[]
  destinations: TDestination[]
  payments: TPayment[]
  allocations: TDestinationAllocation[]
  language: TLanguage
  filePayments?: TPayment[]
  filePrice?: string
}

const buildContextBlock = (
  destinations: TDestination[],
  payments: TPayment[],
  allocations: TDestinationAllocation[]
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
      : '  (nenhum cadastrado)'

  const paymentList =
    payments.length > 0
      ? payments
          .map(
            payment =>
              `  - R$ ${payment.amount}${payment.description ? ` — ${payment.description}` : ''}`
          )
          .join('\n')
      : '  (nenhum ainda)'

  const allocationList =
    allocations.length > 0
      ? allocations
          .map(allocation => {
            const amount = total.times(allocation.percentage / 100)

            return `  - ${allocation.destination.name}: ${allocation.percentage}% = R$ ${StringHelper.formatAmount(amount)}`
          })
          .join('\n')
      : '  (nenhuma ainda)'

  return `CURRENT STATE:
Registered destinations:
${destinationList}

Collected payments (${payments.length}, total R$ ${StringHelper.formatAmount(total)}):
${paymentList}

Destination allocations:
${allocationList}`
}

export const processChat = async (input: TChatInput): Promise<TChatResponse> => {
  const contextBlock = buildContextBlock(input.destinations, input.payments, input.allocations)

  const systemWithContext = `${SYSTEM_PROMPT}

---
Language hint (use only if user language not yet detectable): ${input.language}

${contextBlock}`

  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = input.messages.map(
    message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })
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
      message: text || 'Sorry, I could not process your message. Please try again.',
      action: 'none',
    }
  }

  const parsed: TRawResponse = JSON.parse(jsonMatch[0])

  let resolvedAllocations: TDestinationAllocation[] | undefined

  if (parsed.allocations && parsed.allocations.length > 0) {
    resolvedAllocations = parsed.allocations
      .map(allocation => {
        const destination = input.destinations.find(
          destination => destination.id === allocation.destinationId
        )

        if (!destination) return null

        return { destination, percentage: allocation.percentage }
      })
      .filter((allocation): allocation is TDestinationAllocation => allocation !== null)
  }

  let resolvedPayments: TPayment[] | undefined

  if (input.filePayments && input.filePayments.length > 0) {
    resolvedPayments = input.filePayments
  } else if (parsed.action === 'add_payments' && parsed.payments && parsed.payments.length > 0) {
    resolvedPayments = parsed.payments
      .filter(payment => new BigNumber(String(payment.amount)).isGreaterThan(0))
      .map(payment => ({
        id: uuid.v4(),
        amount: StringHelper.formatAmount(String(payment.amount)),
        description: payment.description,
      }))
  }

  const effectiveAllocations =
    resolvedAllocations && resolvedAllocations.length > 0 ? resolvedAllocations : input.allocations

  let computedSummary: TPaymentSummaryItem[] | undefined

  if (
    (parsed.action === 'request_confirmation' || parsed.action === 'execute') &&
    effectiveAllocations &&
    effectiveAllocations.length > 0
  ) {
    const allPayments = resolvedPayments ?? input.payments

    const total = allPayments.reduce(
      (sum, payment) => sum.plus(new BigNumber(payment.amount || '0')),
      new BigNumber(0)
    )

    computedSummary = effectiveAllocations.map(allocation => ({
      destinationName: allocation.destination.name,
      stellarAddress: allocation.destination.stellarAddress,
      amount: StringHelper.formatAmount(total.times(allocation.percentage / 100)),
      percentage: allocation.percentage,
    }))
  }

  return {
    message: parsed.message || '',
    action: (parsed.action as TChatAction) || 'none',
    payments: resolvedPayments,
    price: input.filePrice,
    allocations: effectiveAllocations,
    summary: computedSummary,
  }
}
