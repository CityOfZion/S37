import axios from 'axios'

import { EnvHelper } from '../helpers/EnvHelper'
import i18n from '../i18next'

export const server = axios.create({
  baseURL: EnvHelper.API_URL,
})

server.interceptors.request.use(config => {
  config.headers.set('Accept-Language', i18n.language)

  return config
})
