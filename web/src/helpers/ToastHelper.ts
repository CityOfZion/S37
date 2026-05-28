import { toast } from 'sonner'

export class ToastHelper {
  static success(title: string, description?: string): void {
    toast.success(title, { description })
  }

  static error(title: string, description?: string): void {
    toast.error(title, { description, duration: 8000 })
  }

  static info(title: string, description?: string): void {
    toast.info(title, { description, duration: 6000 })
  }
}
