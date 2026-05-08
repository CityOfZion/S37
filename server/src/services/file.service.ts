import { parse as csvParse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'
import pdfParse from 'pdf-parse'
import type { TSupportedFileType } from '../types'

export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() as TSupportedFileType | undefined

  if (mimeType === 'text/csv' || ext === 'csv') {
    return parseCsv(buffer)
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    ext === 'xlsx'
  ) {
    return parseExcel(buffer)
  }

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return parsePdf(buffer)
  }

  // Default: treat as plain text
  return buffer.toString('utf-8')
}

function parseCsv(buffer: Buffer): string {
  const records = csvParse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]

  return JSON.stringify(records, null, 2)
}

async function parseExcel(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook()

  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])

  const results: string[] = []

  workbook.eachSheet(sheet => {
    const rows: string[][] = []

    sheet.eachRow({ includeEmpty: false }, row => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1)

      rows.push(values.map(value => (value === null || value === undefined ? '' : String(value))))
    })

    if (rows.length > 0) {
      results.push(`Sheet: ${sheet.name}\n${rows.map(row => row.join(',')).join('\n')}`)
    }
  })

  return results.join('\n\n')
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)

  return data.text
}
