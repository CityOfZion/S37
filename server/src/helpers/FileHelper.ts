import * as XLSX from '@e965/xlsx'
import { parse as csvParse } from 'csv-parse/sync'
import pdfParse from 'pdf-parse'

import type { TSupportedFileType } from '../types'

export class FileHelper {
  private static parseCsv(buffer: Buffer): string {
    const records = csvParse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as Record<string, string>[]

    return JSON.stringify(records, null, 2).trim()
  }

  private static parseExcel(buffer: Buffer): string {
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

  private static async parsePdf(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer)

    return data.text.trim()
  }

  private static parseTxt(buffer: Buffer): string {
    return buffer.toString('utf-8').trim()
  }

  static async parse(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const extension = filename.split('.').pop()?.toLowerCase() as TSupportedFileType | undefined

    if (mimeType === 'text/csv' || extension === 'csv') {
      return FileHelper.parseCsv(buffer)
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      extension === 'xlsx' ||
      extension === 'xls'
    ) {
      return FileHelper.parseExcel(buffer)
    }

    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return await FileHelper.parsePdf(buffer)
    }

    return FileHelper.parseTxt(buffer)
  }
}
