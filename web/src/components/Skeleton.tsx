import { StyleHelper } from '../helpers/StyleHelper'

type TProps = {
  className?: string
}

export const Skeleton = ({ className = 'h-3 w-32' }: TProps) => (
  <div
    className={StyleHelper.merge('rounded bg-neutral-200 animate-pulse', className)}
    aria-hidden="true"
  />
)
