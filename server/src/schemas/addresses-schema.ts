import { z } from 'zod'

import { StellarHelper } from 'fractapay-shared'

export const addressSchema = z.string().refine(StellarHelper.isValidStellarDestination)
