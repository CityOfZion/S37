import type { MultipartValue } from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'

import type {
  TChatDestination,
  TChatMessageHistory,
  TChatResponse,
  TDestination,
  TLanguage,
  TPaymentItem,
} from 'fractapay-shared'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  DEFAULT_LANGUAGE,
  EErrorCode,
  SUPPORTED_LANGUAGES,
  TOKEN,
} from 'fractapay-shared'

import { FileHelper } from '../helpers/FileHelper'
import { requireAuth } from '../hooks/require-auth'
import { analyze } from '../services/ai-service'
import { processChat } from '../services/chat-service'

type TErrorResponse = { success: false; error: EErrorCode }

export const chatRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Reply: TChatResponse | TErrorResponse }>(
    '/chat',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({ success: false, error: EErrorCode.INVALID_PAYLOAD })
      }

      const messagesField = data.fields.messages as MultipartValue<string> | undefined
      const contextField = data.fields.context as MultipartValue<string> | undefined

      if (!messagesField?.value || !contextField?.value) {
        return reply.status(400).send({ success: false, error: EErrorCode.INVALID_PAYLOAD })
      }

      let messages: TChatMessageHistory[] = []
      let destinations: TDestination[] = []
      let payments: TPaymentItem[] = []
      let chatDestinations: TChatDestination[] = []
      let language: TLanguage = DEFAULT_LANGUAGE

      try {
        messages = JSON.parse(messagesField.value)

        const context = JSON.parse(contextField.value)

        destinations = context.destinations || []
        payments = context.payments || []
        chatDestinations = context.chatDestinations || []
        language = context.language || DEFAULT_LANGUAGE
      } catch {
        return reply.status(400).send({ success: false, error: EErrorCode.INVALID_PAYLOAD })
      }

      const acceptLanguage = request.headers['accept-language']?.split(',')[0]?.trim() || ''

      const detectedLanguage = SUPPORTED_LANGUAGES.includes(acceptLanguage as TLanguage)
        ? (acceptLanguage as TLanguage)
        : language

      let filePayments: TPaymentItem[] | undefined
      let fileContent: string | undefined

      const hasFile =
        data.filename &&
        data.filename !== '' &&
        (data.mimetype !== 'application/octet-stream' || data.filename !== '')

      if (hasFile) {
        const extension = data.filename.split('.').pop()?.toLowerCase() ?? ''

        const isAllowed =
          ALLOWED_MIME_TYPES.includes(data.mimetype as (typeof ALLOWED_MIME_TYPES)[number]) ||
          ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])

        if (isAllowed) {
          const chunks: Buffer[] = []

          for await (const chunk of data.file) {
            chunks.push(chunk)
          }

          const buffer = Buffer.concat(chunks)
          let parsedFileContent: string

          try {
            parsedFileContent = await FileHelper.parse(buffer, data.filename, data.mimetype)
          } catch {
            return reply.status(200).send({
              text: '',
              action: 'NONE',
              error: EErrorCode.FILE_PARSE_FAILED,
              fileName: data.filename,
            })
          }

          try {
            const result = await analyze(parsedFileContent, {
              token: TOKEN.TESOURO,
              language: detectedLanguage,
            })

            if (result.payments.length === 0) {
              return reply.status(200).send({
                text: '',
                action: 'NONE',

                error: EErrorCode.NO_PAYMENTS_FOUND,
                fileName: data.filename,
              })
            }

            fileContent = parsedFileContent
            filePayments = result.payments
          } catch {
            return reply.status(200).send({
              text: '',
              action: 'NONE',
              error: EErrorCode.FILE_PARSE_FAILED,
              fileName: data.filename,
            })
          }
        } else {
          for await (const _ of data.file) {
            // drain
          }
        }
      } else {
        for await (const _ of data.file) {
          // drain
        }
      }

      try {
        const result = await processChat({
          messages,
          destinations,
          payments,
          chatDestinations,
          language: detectedLanguage,
          userName: request.user.name,
          filePayments,
          fileContent,
        })

        return reply.status(200).send(result)
      } catch (error) {
        const message = (error as Error).message as EErrorCode
        const code = Object.values(EErrorCode).includes(message) ? message : EErrorCode.UNKNOWN

        return reply.status(500).send({ success: false, error: code })
      }
    }
  )
}
