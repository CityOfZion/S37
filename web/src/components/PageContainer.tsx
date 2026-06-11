import { ReactNode } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'

type TProps = {
  className?: string
  children: ReactNode
}

export const PageContainer = ({ className, children }: TProps) => (
  <main className={StyleHelper.merge('max-w-5xl mx-auto px-4 py-8 space-y-6', className)}>
    {children}
  </main>
)
