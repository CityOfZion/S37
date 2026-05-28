import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNavigate, useParams } from '@tanstack/react-router'

import { StringHelper, TOKEN } from 'fractapay-shared'

import { ToastHelper } from '../helpers/ToastHelper'
import { useChatStore } from '../hooks/use-chat-store'
import { useConversationStore } from '../hooks/use-conversation-store'
import { useLanguageStore } from '../hooks/use-language-store'
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
  const { t: tChat } = useTranslation('pages', { keyPrefix: 'chat' })
  const { t: tChatPaymentsBar } = useTranslation('components', { keyPrefix: 'chatPaymentsBar' })
  const { language } = useLanguageStore()
  const navigate = useNavigate()
  const { conversations } = useConversationStore()
  const { conversationId } = useParams({ strict: false })
  const hasUserMessages = useChatStore(state =>
    state.messages.some(message => message.role === 'user')
  )
  const isProcessing = useChatStore(state => state.isProcessing)
  const [warningOpen, setWarningOpen] = useState(false)
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null)

  const isNewConversation = !conversationId
  const isAlreadyNew = isNewConversation && !hasUserMessages
  const isDisabled = isAlreadyNew || isProcessing

  const doNewConversation = () => {
    onNewConversation()
    void navigate({ to: '/chat' })
    onClose()
  }

  const doSelectConversation = (id: string) => {
    void navigate({ to: '/chat/$conversationId', params: { conversationId: id } })
    onClose()
  }

  const handleNewConversation = () => {
    if (isDisabled) return

    if (isNewConversation && hasUserMessages) {
      setPendingConversationId(null)
      setWarningOpen(true)
    } else {
      doNewConversation()
    }
  }

  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return

    if (isProcessing) {
      ToastHelper.info(tChat('navigatingWhileLoading'))

      return
    }

    if (isNewConversation && hasUserMessages) {
      setPendingConversationId(id)
      setWarningOpen(true)
    } else {
      doSelectConversation(id)
    }
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
            <ul className="space-y-1 px-2">
              {conversations.map(conversation => (
                <li key={conversation.id}>
                  <Button
                    variant="ghost"
                    size="xs"
                    className={
                      conversation.id === conversationId
                        ? 'w-full justify-start px-3 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 text-wrap text-left'
                        : 'w-full justify-start px-3 py-2 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-wrap text-left'
                    }
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    {(() => {
                      const date = new Date(conversation.createdAt).toLocaleDateString(language, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })

                      return conversation.totalAmount
                        ? tChat('conversationTitle', {
                            date,
                            amount: StringHelper.formatCurrencyAmount(
                              conversation.totalAmount,
                              TOKEN.TESOURO
                            ),
                            recipients: tChatPaymentsBar('allocationsCount', {
                              count: conversation.allocations.length,
                            }),
                          })
                        : tChat('conversationTitleEmpty', { date })
                    })()}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SidebarPanel>

      <ConversationWarningModal
        open={warningOpen}
        variant={pendingConversationId ? 'open' : 'new'}
        onOpenChange={open => !open && setWarningOpen(false)}
        onConfirm={() => {
          setWarningOpen(false)

          if (pendingConversationId) {
            doSelectConversation(pendingConversationId)
            setPendingConversationId(null)
          } else {
            doNewConversation()
          }
        }}
      />
    </>
  )
}
