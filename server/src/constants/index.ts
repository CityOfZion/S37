import { EnvHelper } from '../helpers/EnvHelper'

export const isProduction = process.env.NODE_ENV === 'production'

export const isEtherfuseSandbox = EnvHelper.ETHERFUSE_BASE_URL.includes('sand')
