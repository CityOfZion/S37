import { type ComponentType, type ReactNode, type SVGProps } from 'react'

type TProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description?: string
  action?: ReactNode
}

export const EmptyState = ({ icon: Icon, title, description, action }: TProps) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
    <Icon className="size-16 text-neutral-300" aria-hidden="true" />
    <div>
      <p className="text-neutral-500 font-medium">{title}</p>
      {description && <p className="text-neutral-400 text-sm mt-1">{description}</p>}
    </div>
    {action}
  </div>
)
