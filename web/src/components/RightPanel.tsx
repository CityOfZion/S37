import { type ReactNode } from 'react'

import { SidebarPanel, SidebarPanelHeader } from './SidebarPanel'

type TProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export const RightPanel = ({ open, onClose, title, children }: TProps) => (
  <SidebarPanel
    open={open}
    onClose={onClose}
    ariaLabel={title}
    side="right"
    panelClassName="w-full max-w-sm shadow-2xl"
    header={<SidebarPanelHeader title={title} onClose={onClose} />}
  >
    <div className="p-5">{children}</div>
  </SidebarPanel>
)
