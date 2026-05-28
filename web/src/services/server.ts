import axios from 'axios'

import { ErrorCode } from 'fractapay-shared'

import { AUTH_TOKEN_STORAGE_KEY } from '../constants'
import { EnvHelper } from '../helpers/EnvHelper'
import i18n from '../i18next'

const AUTH_WIPE_ERROR_CODES: ReadonlySet<string> = new Set([
  ErrorCode.UNAUTHORIZED,
  ErrorCode.SESSION_EXPIRED,
])

export const server = axios.create({
  baseURL: EnvHelper.API_URL,
})

server.interceptors.request.use(config => {
  config.headers.set('Accept-Language', i18n.language)

  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})

server.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      const requestUrl = error.config?.url ?? ''
      const responseError = error.response?.data?.error

      const isAuthEndpoint = requestUrl.startsWith('/auth/')
      const isAuthErrorCode =
        typeof responseError === 'string' && AUTH_WIPE_ERROR_CODES.has(responseError)

      if (isAuthEndpoint || isAuthErrorCode) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      }
    }

    return Promise.reject(error)
  }
)
