export class ScrollLockHelper {
  static lock(): void {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  static unlock(): void {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }
}
