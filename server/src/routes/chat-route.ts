import type { MultipartValue } from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'

import type {
  TChatHistoryMessage,
  TChatResponse,
  TDestination,
  TDestinationAllocation,
  TLanguage,
  TPayment,
} from 'fractapay-shared'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  DEFAULT_LANGUAGE,
  ErrorCode,
  SUPPORTED_LANGUAGES,
} from 'fractapay-shared'

import { FileHelper } from '../helpers/FileHelper'
import { analyze } from '../services/ai-service'
import { processChat } from '../services/chat-service'

type TErrorResponse = { success: false; error: ErrorCode }

export const chatRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Reply: TChatResponse | TErrorResponse }>('/chat', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
    }

    const messagesField = data.fields.messages as MultipartValue<string> | undefined
    const contextField = data.fields.context as MultipartValue<string> | undefined

    if (!messagesField?.value || !contextField?.value) {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
    }

    let messages: TChatHistoryMessage[] = []
    let destinations: TDestination[] = []
    let payments: TPayment[] = []
    let allocations: TDestinationAllocation[] = []
    let language: TLanguage = DEFAULT_LANGUAGE

    try {
      messages = JSON.parse(messagesField.value)

      const context = JSON.parse(contextField.value)

      destinations = context.destinations || []
      payments = context.payments || []
      allocations = context.allocations || []
      language = context.language || DEFAULT_LANGUAGE
    } catch {
      return reply.status(400).send({ success: false, error: ErrorCode.INVALID_PAYLOAD })
    }

    const acceptLanguage = request.headers['accept-language']?.split(',')[0]?.trim() || ''
    const detectedLanguage = SUPPORTED_LANGUAGES.includes(acceptLanguage as TLanguage)
      ? (acceptLanguage as TLanguage)
      : language

    let filePayments: TPayment[] | undefined
    let filePrice: string | undefined
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
        } catch (error) {
          request.log.error({ filename: data.filename, error }, 'File parse failed')

          return reply.status(200).send({
            message: '',
            action: 'none',
            errorCode: ErrorCode.FILE_PARSE_FAILED,
            filename: data.filename,
          })
        }

        try {
          const result = await analyze(parsedFileContent, {
            token: 'TESOURO',
            language: detectedLanguage,
          })

          if (result.payments.length === 0) {
            return reply.status(200).send({
              message: '',
              action: 'none',
              errorCode: ErrorCode.NO_PAYMENTS_FOUND,
              filename: data.filename,
            })
          }

          fileContent = parsedFileContent
          filePayments = result.payments
          filePrice = result.price
        } catch (error) {
          request.log.error({ filename: data.filename, error }, 'AI analysis failed')

          return reply.status(200).send({
            message: '',
            action: 'none',
            errorCode: ErrorCode.FILE_PARSE_FAILED,
            filename: data.filename,
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
        allocations,
        language: detectedLanguage,
        filePayments,
        filePrice,
        fileContent,
      })

      return reply.status(200).send(result)
    } catch (error) {
      const message = (error as Error).message as ErrorCode
      const code = Object.values(ErrorCode).includes(message) ? message : ErrorCode.UNKNOWN

      return reply.status(500).send({ success: false, error: code })
    }
  })
}
