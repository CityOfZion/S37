type TProps = {
  className?: string
}

export const Skeleton = ({ className = 'h-3 w-32' }: TProps) => (
  <div className={`rounded bg-neutral-200 animate-pulse ${className}`} aria-hidden="true" />
)
