import { ReactNode } from 'react'

type TProps = {
  children: ReactNode
}

export const ErrorBanner = ({ children }: TProps) => (
  <div className="rounded-xl border border-danger-500/30 bg-danger-100 px-4 py-3 text-xs text-neutral-700">
    {children}
  </div>
)
