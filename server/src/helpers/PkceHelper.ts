import { createHash, timingSafeEqual } from 'crypto'

export class PkceHelper {
  static verifyChallenge(verifier: string, challenge: string): boolean {
    if (!verifier || !challenge) return false

    const computed = createHash('sha256').update(verifier).digest('base64url')

    const computedBuffer = Buffer.from(computed)
    const challengeBuffer = Buffer.from(challenge)

    if (computedBuffer.length !== challengeBuffer.length) return false

    return timingSafeEqual(computedBuffer, challengeBuffer)
  }
}
