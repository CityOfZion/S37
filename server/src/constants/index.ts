import { EnvHelper } from '../helpers/EnvHelper'

export const isProduction = process.env.NODE_ENV === 'production'

export const isMainnet = !EnvHelper.ETHERFUSE_BASE_URL.includes('sand')
