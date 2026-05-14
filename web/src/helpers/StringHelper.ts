export class StringHelper {
  static truncateMiddle(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value

    const end = Math.round(maxLength / 2)
    const start = maxLength - end

    return `${value.slice(0, start)}…${value.slice(-end)}`
  }
}
