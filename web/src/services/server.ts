import axios from 'axios'

import { EnvHelper } from '../helpers/EnvHelper'

export const server = axios.create({
  baseURL: EnvHelper.API_URL,
})
