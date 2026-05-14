import { StrKey } from '@stellar/stellar-sdk'

export class StellarHelper {
  static isValidAddress(value: string): boolean {
    return StrKey.isValidEd25519PublicKey(value)
  }
}
