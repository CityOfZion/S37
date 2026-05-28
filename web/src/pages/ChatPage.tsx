import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useBlocker, useNavigate, useParams } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import type { TDestinationAllocation } from 'fractapay-shared'
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, StringHelper } from 'fractapay-shared'

import { Button } from '../components/Button'
import { ChatInput } from '../components/ChatInput'
import { ChatMessage } from '../components/ChatMessage'
import { ChatPaymentsBar } from '../components/ChatPaymentsBar'
import { ChatSidebar } from '../components/ChatSidebar'
import { ChatThinking } from '../components/ChatThinking'
import { DaySeparator } from '../components/DaySeparator'
import { RightPanel } from '../components/RightPanel'
import { Tooltip } from '../components/Tooltip'
import { ToastHelper } from '../helpers/ToastHelper'
import { useChatMutation } from '../hooks/use-chat-mutation'
import { useChatStore } from '../hooks/use-chat-store'
import { useConversationStore } from '../hooks/use-conversation-store'
import { useDestinationsStore } from '../hooks/use-destinations-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { usePageTitle } from '../hooks/use-page-title'
import { usePaymentsStore } from '../hooks/use-payments-store'
import { useSidebarStore } from '../hooks/use-sidebar-store'
import { useUserQuery } from '../hooks/use-user-query'
import { ReviewModal } from '../modals/ReviewModal'

import AttachIcon from '../assets/icons/attach-icon.svg?react'
import MessageIcon from '../assets/icons/message-icon.svg?react'
import RedirectIcon from '../assets/icons/redirect-icon.svg?react'

const isFileAllowed = (file: File): boolean => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  return (
    ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number]) ||
    ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])
  )
}

const isSameDay = (a: string, b: string): boolean => {
  const da = new Date(a)
  const db = new Date(b)

  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export const ChatPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'chat' })
  const { t: tChatPaymentsBar } = useTranslation('components', { keyPrefix: 'chatPaymentsBar' })
  const { t: tSidebar } = useTranslation('components', { keyPrefix: 'sidebar' })
  usePageTitle(t('title'))
  const { language } = useLanguageStore()
  const navigate = useNavigate()
  const { destinations } = useDestinationsStore()
  const { data: user } = useUserQuery()
  const {
    messages,
    payments: chatPayments,
    price,
    allocations,
    addMessage,
    setMessages,
    updateMessage,
    setPayments,
    mergePayments,
    setPrice,
    setAllocations,
    setSummary,
    setIsProcessing,
    draftMessage,
    setDraftMessage,
    reset: resetChat,
  } = useChatStore()
  const {
    setPayments: setStorePayments,
    setToken,
    setPrice: setStorePrice,
    token: paymentToken,
    address,
    setAddress,
  } = usePaymentsStore()

  useEffect(() => {
    if (user?.stellarAddress && user.stellarAddress !== address) {
      setAddress(user.stellarAddress)
    }
  }, [user?.stellarAddress, address, setAddress])
  const { addConversation, conversations, lastConversationId, setLastConversationId } =
    useConversationStore()
  const { conversationId } = useParams({ strict: false })

  const currentConversation = useMemo(
    () => conversations.find(conversation => conversation.id === conversationId),
    [conversations, conversationId]
  )

  const eligibleDestinations = useMemo(
    () => destinations.filter(destination => destination.token === paymentToken),
    [destinations, paymentToken]
  )

  const chatMutation = useChatMutation()
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [executionQueue, setExecutionQueue] = useState<TDestinationAllocation[]>([])
  const [executionKey, setExecutionKey] = useState(0)
  const [orderExecuted, setOrderExecuted] = useState(false)
  const [newConversationId] = useState(() => uuid.v4())
  const [paymentsPanel, setPaymentsPanel] = useState(false)
  const [allocationsPanel, setAllocationsPanel] = useState(false)
  const { chatSidebarOpen, setChatSidebarOpen } = useSidebarStore()

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFileRef = useRef<File | null>(null)
  const lastTextRef = useRef<string>('')
  const isLanguageMounted = useRef(false)

  const isViewingConversation = !!conversationId
  const hasUserMessage = messages.some(message => message.role === 'user')
  const isLoading = chatMutation.isPending
  const isLoadingRef = useRef(false)
  const inputDisabled = isLoading || orderExecuted || isViewingConversation

  useEffect(() => {
    isLoadingRef.current = isLoading
  })

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    }, 250)
  }, [messages])

  const shouldBlockNavigation = useCallback(() => {
    if (!isLoadingRef.current) return false

    ToastHelper.info(t('navigatingWhileLoading'))

    return true
  }, [t])

  useBlocker({ shouldBlockFn: shouldBlockNavigation, enableBeforeUnload: false })

  useEffect(() => {
    if (!isLoading && !(!conversationId && hasUserMessage)) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isLoading, conversationId, hasUserMessage])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!conversationId && lastConversationId) {
      void navigate({ to: '/chat/$conversationId', params: { conversationId: lastConversationId } })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (conversationId) {
      setLastConversationId(conversationId)
    }
  }, [conversationId, setLastConversationId])

  useEffect(() => {
    if (useChatStore.getState().messages.length === 0) {
      addMessage({
        id: uuid.v4(),
        role: 'assistant',
        content: t('greeting'),
        type: 'text',
        timestamp: new Date().toISOString(),
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLanguageMounted.current) {
      isLanguageMounted.current = true

      return
    }

    const { messages: currentMessages } = useChatStore.getState()

    if (currentMessages.length !== 1) return

    updateMessage(currentMessages[0].id, { content: t('greeting') })
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversationId) return

    const conversation = useConversationStore
      .getState()
      .conversations.find(conversation => conversation.id === conversationId)

    if (!conversation) return

    resetChat()
    setMessages(conversation.messages)
  }, [conversationId, resetChat, setMessages])

  const startExecution = useCallback(
    (queue: TDestinationAllocation[]) => {
      if (queue.length === 0) return

      const hasPendingOrder = conversations.some(
        conversation => conversation.orderId && conversation.orderStatus === 'created'
      )

      if (hasPendingOrder) {
        setTimeout(() => {
          ToastHelper.error(t('pendingPaymentError'))
          void navigate({ to: '/payments' })
        }, 250)

        return
      }

      const first = queue[0]

      setStorePayments(chatPayments)
      setStorePrice(price)
      setToken(first.destination.token)
      setExecutionQueue(queue)
      setExecutionKey(previous => previous + 1)
      setReviewModalOpen(true)
    },
    [chatPayments, price, setStorePayments, setStorePrice, setToken, conversations, t, navigate]
  )

  const sendMessage = useCallback(
    async (text: string, file?: File | null) => {
      if (!text.trim() && !file) return
      if (orderExecuted) return

      const userMessageContent = file
        ? text.trim()
          ? `${text.trim()}\n${file.name}`
          : file.name
        : text.trim()

      if (file) {
        lastFileRef.current = file
        lastTextRef.current = text.trim()
      }

      addMessage({
        id: uuid.v4(),
        role: 'user',
        content: userMessageContent,
        type: file ? 'file-import' : 'text',
        timestamp: new Date().toISOString(),
      })

      setDraftMessage('')
      setAttachedFile(null)
      setIsProcessing(true)

      const conversationHistory = [
        ...messages.map(message => ({ role: message.role, content: message.content })),
        { role: 'user' as const, content: userMessageContent },
      ]

      chatMutation.mutate(
        {
          messages: conversationHistory,
          destinations: eligibleDestinations,
          payments: chatPayments,
          allocations,
          language,
          file: file ?? undefined,
        },
        {
          onSuccess: response => {
            const content = response.errorCode
              ? response.errorCode === 'NO_PAYMENTS_FOUND'
                ? t('noPaymentsFound', { filename: response.filename ?? '' })
                : t('fileParseError', { filename: response.filename ?? '' })
              : response.message || t('error')

            addMessage({
              id: uuid.v4(),
              role: 'assistant',
              content,
              type: response.action === 'request_confirmation' ? 'summary' : 'text',
              summary: response.summary,
              timestamp: new Date().toISOString(),
            })

            if (response.errorCode && lastFileRef.current) {
              setAttachedFile(lastFileRef.current)
              if (lastTextRef.current) setDraftMessage(lastTextRef.current)
            }

            requestAnimationFrame(() => textareaRef.current?.focus())

            if (response.action === 'add_payments' && response.payments?.length) {
              mergePayments(response.payments)
              if (response.price) setPrice(response.price)
            }

            if (response.action === 'update_payments' && response.payments) {
              setPayments(response.payments)
            }

            if (
              (response.action === 'set_allocations' ||
                response.action === 'request_confirmation') &&
              response.allocations
            ) {
              setAllocations(response.allocations)
            }

            if (response.action === 'request_confirmation' && response.summary) {
              setSummary(response.summary)
            }

            if (response.action === 'execute') startExecution(allocations)
            if (response.action === 'clear') resetChat()
          },
          onSettled: () => setIsProcessing(false),
          onError: () => ToastHelper.error(t('error')),
        }
      )
    },
    [
      messages,
      chatPayments,
      allocations,
      eligibleDestinations,
      language,
      chatMutation,
      addMessage,
      setDraftMessage,
      setPayments,
      mergePayments,
      setPrice,
      setAllocations,
      setSummary,
      setIsProcessing,
      resetChat,
      startExecution,
      orderExecuted,
      t,
    ]
  )

  const handlePaymentCompleted = useCallback(
    (orderId?: string) => {
      setOrderExecuted(true)

      const total = chatPayments.reduce(
        (sum, payment) => sum.plus(new BigNumber(payment.amount || '0')),
        new BigNumber(0)
      )

      const title = new Date().toISOString()

      addConversation({
        id: newConversationId,
        title,
        messages: useChatStore.getState().messages,
        payments: chatPayments,
        allocations,
        summary: useChatStore.getState().summary,
        orderId,
        orderStatus: 'created',
        totalAmount: StringHelper.formatAmount(total),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      resetChat()
      void navigate({ to: '/chat/$conversationId', params: { conversationId: newConversationId } })
    },
    [chatPayments, allocations, newConversationId, addConversation, resetChat, navigate]
  )

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      if (!isFileAllowed(file)) {
        ToastHelper.error(t('unsupportedFile'))
      } else {
        setAttachedFile(file)
      }
    }

    event.target.value = ''
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(draftMessage, attachedFile)
    }
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (inputDisabled) return
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (inputDisabled) return

    const file = event.dataTransfer.files[0]

    if (file) {
      if (!isFileAllowed(file)) {
        ToastHelper.error(t('unsupportedFile'))

        return
      }

      setAttachedFile(file)
    }
  }

  const allocationTotal = useMemo(
    () =>
      chatPayments.reduce(
        (sum, payment) => sum.plus(new BigNumber(payment.amount || '0')),
        new BigNumber(0)
      ),
    [chatPayments]
  )

  const suggestions = [t('suggestion1'), t('suggestion2'), t('suggestion3')]

  const handleNewConversation = useCallback(() => {
    resetChat()
    setLastConversationId(null)
    addMessage({
      id: uuid.v4(),
      role: 'assistant',
      content: t('greeting'),
      type: 'text',
      timestamp: new Date().toISOString(),
    })
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [resetChat, setLastConversationId, addMessage, t])

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] lg:min-h-screen">
      <ChatSidebar
        open={chatSidebarOpen}
        onClose={() => setChatSidebarOpen(false)}
        onNewConversation={handleNewConversation}
      />

      <div
        className="relative flex flex-col flex-1 min-w-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="fixed inset-0 lg:left-124 z-50 flex flex-col items-center justify-center gap-3 bg-primary/10 border-2 border-dashed border-primary pointer-events-none">
            <AttachIcon className="size-10 text-primary" aria-hidden="true" />
            <p className="text-primary font-semibold text-lg">{t('dropFile')}</p>
          </div>
        )}

        <Tooltip content={tSidebar('openConversations')}>
          <Button
            variant="ghost"
            size="xs"
            className="lg:hidden fixed top-18 left-0 z-20 h-9 pl-2 pr-3 min-h-0 rounded-r-full border border-l-0 border-neutral-200 bg-white shadow-sm text-neutral-500 hover:text-primary hover:border-primary/30 focus:text-primary focus:border-primary/30 active:text-primary active:border-primary/30"
            onClick={() => setChatSidebarOpen(true)}
            aria-label={tSidebar('openConversations')}
            tabIndex={chatSidebarOpen ? -1 : undefined}
            aria-hidden={chatSidebarOpen}
          >
            <MessageIcon className="size-5" aria-hidden="true" />
          </Button>
        </Tooltip>

        {currentConversation?.orderId && (
          <div className="sticky top-0 z-10 flex justify-center pt-4 pointer-events-none">
            <div className="relative pointer-events-auto">
              <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
              <Button
                size="sm"
                className="relative shadow-lg gap-1.5 group transition-transform duration-200 hover:-translate-y-px hover:shadow-xl"
                onClick={() =>
                  void navigate({
                    to: '/payments/$orderId',
                    params: { orderId: currentConversation.orderId! },
                  })
                }
              >
                {t('goToPayment')}
                <RedirectIcon
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        )}

        <div
          ref={messagesContainerRef}
          className="flex-1 px-4 py-6 space-y-4 max-w-3xl mx-auto w-full"
        >
          {messages.map((message, index) => {
            const prevMessage = messages[index - 1]
            const showDaySeparator =
              index === 0 || (prevMessage && !isSameDay(prevMessage.timestamp, message.timestamp))
            const dayLabel = showDaySeparator
              ? (() => {
                  const label = new Date(message.timestamp).toLocaleDateString(language, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })

                  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
                })()
              : null

            return (
              <div key={message.id}>
                {dayLabel && <DaySeparator label={dayLabel} />}
                <ChatMessage
                  message={message}
                  language={language}
                  userName={user?.name ?? user?.email}
                  userPicture={user?.picture}
                />
              </div>
            )
          })}
          {isLoading && <ChatThinking />}
        </div>

        <div className="sticky bottom-0 z-10 bg-neutral-50 border-t border-neutral-100 flex flex-col gap-y-2 py-4">
          <ChatPaymentsBar
            payments={chatPayments}
            allocations={allocations}
            token={paymentToken}
            onOpenPayments={() => setPaymentsPanel(true)}
            onOpenAllocations={() => setAllocationsPanel(true)}
            orderExecuted={orderExecuted}
          />

          <ChatInput
            draftMessage={draftMessage}
            attachedFile={attachedFile}
            disabled={inputDisabled}
            orderExecuted={orderExecuted}
            hasUserMessage={hasUserMessage}
            fileInputRef={fileInputRef}
            textareaRef={textareaRef}
            suggestions={suggestions}
            onChangeDraft={setDraftMessage}
            onRemoveFile={() => setAttachedFile(null)}
            onFileChange={handleFileChange}
            onKeyDown={handleKeyDown}
            onSubmit={() => void sendMessage(draftMessage, attachedFile)}
            onSelectSuggestion={text => {
              setDraftMessage(text)
              textareaRef.current?.focus()
            }}
          />
        </div>
      </div>

      <RightPanel
        open={paymentsPanel}
        onClose={() => setPaymentsPanel(false)}
        title={t('paymentsTitle')}
      >
        {chatPayments.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {tChatPaymentsBar('paymentsCount', { count: 0 })}
          </p>
        ) : (
          <ul className="space-y-3">
            {chatPayments.map(payment => (
              <li
                key={payment.id}
                className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3"
              >
                <p className="text-sm font-semibold text-neutral-900">
                  {StringHelper.formatCurrencyAmount(payment.amount, paymentToken)}
                </p>
                {payment.description && (
                  <p className="text-xs text-neutral-500 mt-0.5 wrap-break-word">
                    {payment.description}
                  </p>
                )}
              </li>
            ))}
            <li className="flex items-center justify-between px-1 pt-3 border-t border-neutral-200">
              <span className="text-sm font-bold text-neutral-900">{t('total')}</span>
              <span className="text-sm font-bold text-primary">
                {StringHelper.formatCurrencyAmount(
                  StringHelper.formatAmount(allocationTotal),
                  paymentToken
                )}
              </span>
            </li>
          </ul>
        )}
      </RightPanel>

      <RightPanel
        open={allocationsPanel}
        onClose={() => setAllocationsPanel(false)}
        title={t('allocationsTitle')}
      >
        {allocations.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {tChatPaymentsBar('allocationsCount', { count: 0 })}
          </p>
        ) : (
          <ul className="space-y-3">
            {allocations.map(allocation => {
              const amount = allocationTotal.times(allocation.percentage / 100)

              return (
                <li
                  key={allocation.destination.id}
                  className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {allocation.destination.name}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {StringHelper.formatCurrencyAmount(
                          StringHelper.formatAmount(amount),
                          paymentToken
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0">
                      {allocation.percentage}%
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </RightPanel>

      {executionQueue.length > 0 && (
        <ReviewModal
          key={executionKey}
          open={reviewModalOpen}
          onOpenChange={open => {
            if (open) return
            setReviewModalOpen(false)
            setExecutionQueue([])
          }}
          recipientAddress={address}
          allocations={executionQueue}
          onPaymentCompleted={handlePaymentCompleted}
        />
      )}
    </div>
  )
}
