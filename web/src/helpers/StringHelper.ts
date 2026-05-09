export class StringHelper {
  static truncateMiddle(value: string, maxLength: number): string {
    const end = Math.round(maxLength / 2)
    const start = maxLength - end

    return `${value.slice(0, start)}…${value.slice(-end)}`
  }
}
