import { StrKey } from '@stellar/stellar-sdk'

export class StellarHelper {
  static isValidAddress(value: string): boolean {
    return StrKey.isValidEd25519PublicKey(value)
  }

  static isValidContractAddress(value: string): boolean {
    return StrKey.isValidContract(value)
  }

  static isValidStellarDestination(value: string): boolean {
    return StrKey.isValidEd25519PublicKey(value) || StrKey.isValidContract(value)
  }
}
