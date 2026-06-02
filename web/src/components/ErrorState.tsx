import WarningIcon from '../assets/icons/warning-icon.svg?react'

type TProps = {
  title: string
}

export const ErrorState = ({ title }: TProps) => (
  <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-8 flex flex-col items-center text-center gap-4 select-none">
    <div className="flex items-center justify-center size-16 rounded-full border border-red-100 bg-red-50">
      <WarningIcon className="size-8 text-red-500" aria-hidden="true" />
    </div>
    <p className="text-sm font-medium text-neutral-500">{title}</p>
  </div>
)
