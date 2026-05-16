import type { MultipartValue } from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'

import type { TLanguage, TToken, TUploadResult } from 'fractapay-shared'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  DEFAULT_LANGUAGE,
  ErrorCode,
  StellarHelper,
  SUPPORTED_LANGUAGES,
  SUPPORTED_TOKENS,
} from 'fractapay-shared'

import { FileHelper } from '../helpers/FileHelper'
import { analyze } from '../services/ai-service'

export const uploadRoute = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Reply: TUploadResult }>('/upload', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply
        .status(400)
        .send({ success: false, payments: [], price: '0', error: ErrorCode.NO_FILE })
    }

    const tokenField = data.fields.token as MultipartValue<string> | undefined
    const token = tokenField?.value as TToken | undefined

    if (!token || !SUPPORTED_TOKENS.includes(token)) {
      return reply.status(400).send({
        success: false,
        payments: [],
        price: '0',
        error: ErrorCode.INVALID_TOKEN,
      })
    }

    const addressField = data.fields.address as MultipartValue<string> | undefined
    const address = addressField?.value

    if (!address || !StellarHelper.isValidAddress(address)) {
      return reply.status(400).send({
        success: false,
        payments: [],
        price: '0',
        error: ErrorCode.INVALID_ADDRESS,
      })
    }

    const extension = data.filename.split('.').pop()?.toLowerCase() ?? ''

    if (
      !ALLOWED_MIME_TYPES.includes(data.mimetype as (typeof ALLOWED_MIME_TYPES)[number]) &&
      !ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])
    ) {
      return reply.status(400).send({
        success: false,
        payments: [],
        price: '0',
        error: ErrorCode.UNSUPPORTED_FILE_TYPE,
      })
    }

    const chunks: Buffer[] = []

    for await (const chunk of data.file) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)

    try {
      const fileContent = await FileHelper.parse(buffer, data.filename, data.mimetype)

      const acceptLanguage = request.headers['accept-language']?.split(',')[0]?.trim() || ''
      const language = SUPPORTED_LANGUAGES.includes(acceptLanguage as TLanguage)
        ? (acceptLanguage as TLanguage)
        : DEFAULT_LANGUAGE

      const result = await analyze(fileContent, { token, language })

      return reply.status(200).send({
        success: true,
        payments: result.payments,
        price: result.price,
      })
    } catch (error) {
      const message = (error as Error).message as ErrorCode
      const code = Object.values(ErrorCode).includes(message) ? message : ErrorCode.UNKNOWN

      return reply.status(500).send({ success: false, payments: [], price: '0', error: code })
    }
  })
}
