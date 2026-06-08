import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto'

import { EnvHelper } from './EnvHelper'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

const deriveKey = (): Buffer => createHash('sha256').update(EnvHelper.ENCRYPTION_SECRET).digest()

export class EncryptionHelper {
  static encrypt(text: string): string {
    const key = deriveKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':')
  }

  static decrypt(text: string): string {
    const key = deriveKey()
    const [ivBase64, tagBase64, dataBase64] = text.split(':')
    const iv = Buffer.from(ivBase64, 'base64')
    const tag = Buffer.from(tagBase64, 'base64')
    const data = Buffer.from(dataBase64, 'base64')
    const decipher = createDecipheriv(ALGORITHM, key, iv)

    decipher.setAuthTag(tag)

    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  }

  static hmac(id: string, key: string): string {
    return createHmac('sha256', EnvHelper.ENCRYPTION_SECRET).update(`${id}:${key}`).digest('hex')
  }
}
