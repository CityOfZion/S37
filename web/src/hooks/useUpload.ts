import { useMutation } from '@tanstack/react-query'

import type { TUploadPayload, TUploadResult } from 'fractapay-shared'

import { upload } from '../services/api'

export function useUpload() {
  return useMutation<TUploadResult, Error, TUploadPayload>({
    mutationFn: upload,
  })
}
