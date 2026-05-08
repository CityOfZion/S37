import type { FastifyInstance } from 'fastify'
import { analyzePayments } from '../services/ai.service'
import { parseFile } from '../services/file.service'
import type { TUploadResult } from '../types'

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Reply: TUploadResult }>('/upload', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ success: false, payments: [], error: 'No file provided' })
    }

    const allowedMimeTypes = [
      'text/csv',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
    ]

    const allowedExtensions = ['csv', 'xlsx', 'pdf', 'txt']
    const ext = data.filename.split('.').pop()?.toLowerCase() ?? ''

    if (!allowedMimeTypes.includes(data.mimetype) && !allowedExtensions.includes(ext)) {
      return reply.status(400).send({
        success: false,
        payments: [],
        error: `Unsupported file type: ${data.mimetype}. Allowed: CSV, XLS, XLSX, PDF, TXT`,
      })
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const fileContent = await parseFile(buffer, data.mimetype, data.filename)
    const result = await analyzePayments(fileContent)

    return reply.status(200).send({
      success: true,
      payments: result.payments,
    })
  })

  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok', service: 'fractapay-server' })
  })
}
