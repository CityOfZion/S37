export class PkceHelper {
  static #toBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
    let binary = ''

    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  static generateVerifier(): string {
    const bytes = new Uint8Array(32)

    crypto.getRandomValues(bytes)

    return this.#toBase64Url(bytes)
  }

  static async computeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)

    return this.#toBase64Url(new Uint8Array(digest))
  }
}
