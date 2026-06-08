import { isMainnet } from '../constants'

export class StellarExpertsHelper {
  static readonly #url = 'https://stellar.expert/explorer'
  static readonly #network = isMainnet ? 'public' : 'testnet'

  static getTransactionUrl(hash: string): string {
    return `${this.#url}/${this.#network}/tx/${hash}`
  }

  static getAddressUrl(address: string): string {
    return `${this.#url}/${this.#network}/account/${address}`
  }
}
