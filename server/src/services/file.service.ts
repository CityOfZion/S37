import * as XLSX from '@e965/xlsx'
import { parse as csvParse } from 'csv-parse/sync'
import pdfParse from 'pdf-parse'

import type { TSupportedFileType } from '../types'

export async function parseFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const extension = filename.split('.').pop()?.toLowerCase() as TSupportedFileType | undefined

  if (mimeType === 'text/csv' || extension === 'csv') {
    return parseCsv(buffer)
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    extension === 'xlsx' ||
    extension === 'xls'
  ) {
    return parseExcel(buffer)
  }

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return await parsePdf(buffer)
  }

  return parseTxt(buffer)
}

function parseCsv(buffer: Buffer): string {
  const records = csvParse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]

  return JSON.stringify(records, null, 2).trim()
}

function parseExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const results: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const value = XLSX.utils.sheet_to_csv(sheet).trim()

    if (value) {
      results.push(`Sheet: ${sheetName}\n${value}`)
    }
  }

  return results.join('\n\n').trim()
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)

  return data.text.trim()
}

function parseTxt(buffer: Buffer): string {
  return buffer.toString('utf-8').trim()
}
