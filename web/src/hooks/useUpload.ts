import { useMutation } from '@tanstack/react-query'

import type { TUploadResult } from 'fractapay-shared'

import { uploadPaymentFile } from '../services/api'

export function useUpload() {
  return useMutation<TUploadResult, Error, File>({
    mutationFn: uploadPaymentFile,
  })
}
