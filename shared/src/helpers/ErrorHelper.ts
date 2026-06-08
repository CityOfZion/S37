import { EErrorCode } from '../types'

export class ErrorHelper {
  static map(error: unknown): EErrorCode {
    const message = (error as Error).message as EErrorCode

    return Object.values(EErrorCode).includes(message) ? message : EErrorCode.UNKNOWN
  }
}
