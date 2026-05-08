import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config'
import { ErrorCode } from 'fractapay-shared'
import type { TPaymentResponse } from 'fractapay-shared'

const client = new Anthropic({ apiKey: config.anthropicApiKey })

const SYSTEM_PROMPT = `You are a financial data extraction assistant specializing in Stellar blockchain payments.
Your task is to analyze file content and extract payment information.
Always return valid JSON only — no explanations, no markdown, just the JSON object.`

const buildUserPrompt = (fileContent: string): string => `
Analyze the following file content and extract all payment information.

For each payment entry found, extract:
1. "amount": the payment amount as a number (decimal allowed)
2. "address": the Stellar wallet address (G-address, 56 characters starting with G) or any identifier that looks like a recipient
3. "description": optional — any description, name, or purpose associated with the payment

Return ONLY a valid JSON object with this exact structure:
{
  "payments": [
    {
      "amount": 100.50,
      "address": "GABC...XYZ",
      "description": "Optional description"
    }
  ]
}

If no valid Stellar address is found but there is a recipient identifier, include it as-is in the "address" field.
If no payments are found, return: { "payments": [] }

File content to analyze:
---
${fileContent}
---`

export async function analyzePayments(fileContent: string): Promise<TPaymentResponse> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(fileContent),
      },
    ],
  })

  const content = message.content[0]

  if (content.type !== 'text') {
    throw new Error(ErrorCode.AI_RESPONSE_TYPE)
  }

  const jsonMatch = content.text.match(/\{[\s\S]*}/)

  if (!jsonMatch) {
    throw new Error(ErrorCode.AI_PARSE_FAILED)
  }

  return JSON.parse(jsonMatch[0]) as TPaymentResponse
}
