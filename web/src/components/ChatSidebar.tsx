import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate } from '@tanstack/react-router'

import { useChatStore } from '../hooks/use-chat-store'
import { useConversationStore } from '../hooks/use-conversation-store'
import { ConversationWarningModal } from '../modals/ConversationWarningModal'
import { Button } from './Button'
import { SidebarPanel } from './SidebarPanel'
import { Tooltip } from './Tooltip'

import CloseIcon from '../assets/icons/close-icon.svg?react'
import MessageIcon from '../assets/icons/message-icon.svg?react'
import PlusIcon from '../assets/icons/plus-icon.svg?react'

type TProps = {
  open: boolean
  onClose: () => void
  onNewConversation: () => void
}

export const ChatSidebar = ({ open, onClose, onNewConversation }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'sidebar' })
  const navigate = useNavigate()
  const { conversations, setActiveConversation, activeConversationId } = useConversationStore()
  const hasUserMessages = useChatStore(state =>
    state.messages.some(message => message.role === 'user')
  )
  const isProcessing = useChatStore(state => state.isProcessing)
  const [warningOpen, setWarningOpen] = useState(false)

  const isNewConversation = activeConversationId === null
  const isAlreadyNew = isNewConversation && !hasUserMessages
  const isDisabled = isAlreadyNew || isProcessing

  const doNewConversation = () => {
    onNewConversation()
    void navigate({ to: '/chat' })
    onClose()
  }

  const handleNewConversation = () => {
    if (isDisabled) return

    if (isNewConversation && hasUserMessages) {
      setWarningOpen(true)
    } else {
      doNewConversation()
    }
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id)
    void navigate({ to: '/chat' })
    onClose()
  }

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0">
      <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400 select-none">
        {t('recentConversations')}
      </span>
      <div className="flex items-center gap-1">
        <Tooltip content={t('newConversation')}>
          <Button
            variant="ghost"
            size="xs"
            className="hidden lg:inline-flex p-1.5 hover:text-primary focus:text-primary active:text-primary"
            onClick={handleNewConversation}
            aria-label={t('newConversation')}
            disabled={isDisabled}
          >
            <PlusIcon className="size-4" aria-hidden="true" />
          </Button>
        </Tooltip>
        <Tooltip content={t('closeMenu')}>
          <Button
            variant="ghost"
            size="xs"
            className="p-1.5 text-neutral-400 hover:text-neutral-900 lg:hidden"
            onClick={onClose}
            aria-label={t('closeMenu')}
          >
            <CloseIcon className="size-5" aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
    </div>
  )

  const footer = (
    <div className="p-4 border-t border-neutral-100 shrink-0">
      <Button
        variant="outline"
        size="xs"
        className="w-full gap-2 justify-start"
        onClick={handleNewConversation}
        disabled={isDisabled}
      >
        <PlusIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{t('newConversation')}</span>
      </Button>
    </div>
  )

  return (
    <>
      <SidebarPanel
        open={open}
        onClose={onClose}
        ariaLabel={t('recentConversations')}
        side="left"
        staticOnDesktop={true}
        panelClassName="w-64"
        header={header}
        footer={footer}
      >
        <div className="py-2">
          {conversations.length === 0 ? (
            <div className="p-8 flex flex-col items-center gap-2 text-center">
              <MessageIcon className="size-8 text-neutral-300" aria-hidden="true" />
              <p className="text-xs text-neutral-400 leading-relaxed select-none">
                {t('conversationsEmpty')}
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5 px-2">
              {conversations.map(conversation => (
                <li key={conversation.id}>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="w-full justify-start px-3 py-2 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 truncate"
                    title={conversation.title}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    {conversation.title}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SidebarPanel>

      <ConversationWarningModal
        open={warningOpen}
        onOpenChange={open => !open && setWarningOpen(false)}
        onConfirm={() => {
          setWarningOpen(false)
          doNewConversation()
        }}
      />
    </>
  )
}
