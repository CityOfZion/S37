export const ALLOWED_EXTENSIONS = ['csv', 'xls', 'xlsx', 'pdf', 'txt'] as const

export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
] as const

export const ALLOWED_INPUT_ACCEPT = ALLOWED_EXTENSIONS.map(extension => `.${extension}`).join(',')
