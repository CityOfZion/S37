type TProps = {
  label: string
}

export const DaySeparator = ({ label }: TProps) => (
  <div className="flex items-center gap-3 select-none mb-4" role="separator">
    <div className="flex-1 h-px bg-neutral-200" />
    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
      {label}
    </span>
    <div className="flex-1 h-px bg-neutral-200" />
  </div>
)
