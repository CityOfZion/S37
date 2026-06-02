import { StrKey } from '@stellar/stellar-sdk'

export class StellarHelper {
  static isValidAddress(address: string): boolean {
    return StrKey.isValidEd25519PublicKey(address)
  }
}
