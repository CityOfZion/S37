import type { FastifyInstance } from 'fastify'
import { analyzePayments } from '../services/ai.service'
import { parseFile } from '../services/file.service'
import { ErrorCode } from 'fractapay-shared'
import type { TUploadResult } from 'fractapay-shared'

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Reply: TUploadResult }>('/upload', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ success: false, payments: [], error: ErrorCode.NO_FILE })
    }

    const allowedMimeTypes = [
      'text/csv',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
    ]

    const allowedExtensions = ['csv', 'xlsx', 'pdf', 'txt']
    const extension = data.filename.split('.').pop()?.toLowerCase() ?? ''

    if (!allowedMimeTypes.includes(data.mimetype) && !allowedExtensions.includes(extension)) {
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
      const fileContent = await parseFile(buffer, data.mimetype, data.filename)
      const result = await analyzePayments(fileContent)

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

  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok', service: 'fractapay-server' })
  })
}
