import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export class StyleHelper {
  static merge(...values: ClassValue[]): string {
    return twMerge(clsx(values))
  }
}
