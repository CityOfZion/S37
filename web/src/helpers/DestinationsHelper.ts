import i18next from 'i18next'

export class DestinationsHelper {
  static formatPercentage(percentage: number): string {
    return percentage === 100 ? i18next.t('common:fullAllocation') : `${percentage}%`
  }
}
