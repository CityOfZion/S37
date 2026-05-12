import type { MultipartValue } from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'

import type { TToken, TUploadResult } from 'fractapay-shared'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  ErrorCode,
  SUPPORTED_TOKENS,
} from 'fractapay-shared'

import { analyzePayments } from '../services/ai.service'
import { parseFile } from '../services/file.service'

export const uploadRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Reply: TUploadResult }>('/upload', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ success: false, payments: [], error: ErrorCode.NO_FILE })
    }

    const tokenField = data.fields.token as MultipartValue<string>
    const token = tokenField.value as TToken

    if (!SUPPORTED_TOKENS.includes(token)) {
      return reply.status(400).send({
        success: false,
        payments: [],
        error: ErrorCode.INVALID_TOKEN,
      })
    }

    const destinationAddressField = data.fields.destinationAddress as
      | MultipartValue<string>
      | undefined
    const destinationAddress = destinationAddressField?.value

    const extension = data.filename.split('.').pop()?.toLowerCase() ?? ''

    if (
      !ALLOWED_MIME_TYPES.includes(data.mimetype as (typeof ALLOWED_MIME_TYPES)[number]) &&
      !ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])
    ) {
      return reply.status(400).send({
        success: false,
        payments: [],
        error: ErrorCode.UNSUPPORTED_FILE_TYPE,
      })
    }

    const chunks: Buffer[] = []

    for await (const chunk of data.file) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)

    try {
      const fileContent = await parseFile(buffer, data.filename, data.mimetype)

      const result = await analyzePayments(fileContent, {
        token,
        destinationAddress,
      })

      return reply.status(200).send({
        success: true,
        payments: result.payments,
      })
    } catch (error) {
      const message = (error as Error).message as ErrorCode
      const code = Object.values(ErrorCode).includes(message) ? message : ErrorCode.UNKNOWN

      return reply.status(500).send({ success: false, payments: [], error: code })
    }
  })
}
