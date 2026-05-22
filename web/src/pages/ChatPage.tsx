import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import type { TChatMessage, TDestinationAllocation } from 'fractapay-shared'
import { StringHelper as SH, StringHelper } from 'fractapay-shared'

import { Button } from '../components/Button'
import { ReviewModal } from '../components/ReviewModal'
import { Tooltip } from '../components/Tooltip'
import { StyleHelper } from '../helpers/StyleHelper'
import { ToastHelper } from '../helpers/ToastHelper'
import { useChatMutation } from '../hooks/use-chat-mutation'
import { useChatStore } from '../hooks/use-chat-store'
import { useDestinationsStore } from '../hooks/use-destinations-store'
import { useLanguageStore } from '../hooks/use-language-store'
import { usePaymentsStore } from '../hooks/use-payments-store'

import AttachIcon from '../assets/icons/attach-icon.svg?react'
import CloseIcon from '../assets/icons/close-icon.svg?react'
import LoadingSpinnerIcon from '../assets/icons/loading-spinner-icon.svg?react'
import SendIcon from '../assets/icons/send-icon.svg?react'
import UploadIcon from '../assets/icons/upload-icon.svg?react'

export const ChatPage = () => {
  const { t } = useTranslation('components', { keyPrefix: 'chat' })
  const { language } = useLanguageStore()
  const { destinations } = useDestinationsStore()
  const {
    messages,
    payments: chatPayments,
    price,
    allocations,
    addMessage,
    mergePayments,
    setPrice,
    setAllocations,
    setSummary,
    reset: resetChat,
  } = useChatStore()
  const {
    setPayments: setStorePayments,
    setAddress,
    setToken,
    setPrice: setStorePrice,
  } = usePaymentsStore()
  const chatMutation = useChatMutation()

  const [inputText, setInputText] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [executionQueue, setExecutionQueue] = useState<TDestinationAllocation[]>([])
  const [currentAllocation, setCurrentAllocation] = useState<TDestinationAllocation | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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

  const startExecution = useCallback(
    (queue: TDestinationAllocation[]) => {
      if (queue.length === 0) return

      const first = queue[0]

      setStorePayments(chatPayments)
      setStorePrice(price)
      setToken(first.destination.token)
      setAddress(first.destination.stellarAddress)
      setExecutionQueue(queue)
      setCurrentAllocation(first)
      setReviewModalOpen(true)
    },
    [chatPayments, price, setStorePayments, setStorePrice, setToken, setAddress]
  )

  const sendMessage = useCallback(
    async (text: string, file?: File | null) => {
      if (!text.trim() && !file) return

      const userMessageContent = file
        ? text.trim()
          ? `${text.trim()}\n📎 ${file.name}`
          : `📎 ${file.name}`
        : text.trim()

      const userMessage: TChatMessage = {
        id: uuid.v4(),
        role: 'user',
        content: userMessageContent,
        type: file ? 'file-import' : 'text',
        timestamp: new Date().toISOString(),
      }

      addMessage(userMessage)
      setInputText('')
      setAttachedFile(null)

      const conversationHistory = [
        ...messages.map(message => ({ role: message.role, content: message.content })),
        { role: 'user' as const, content: userMessageContent },
      ]

      chatMutation.mutate(
        {
          messages: conversationHistory,
          destinations,
          payments: chatPayments,
          allocations,
          language,
          file: file ?? undefined,
        },
        {
          onSuccess: response => {
            const assistantMessage: TChatMessage = {
              id: uuid.v4(),
              role: 'assistant',
              content: response.message,
              type: response.action === 'request_confirmation' ? 'summary' : 'text',
              summary: response.summary,
              timestamp: new Date().toISOString(),
            }

            addMessage(assistantMessage)
            textareaRef.current?.focus()

            if (
              response.action === 'add_payments' &&
              response.payments &&
              response.payments.length > 0
            ) {
              mergePayments(response.payments)
              if (response.price) setPrice(response.price)
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

            if (response.action === 'execute') {
              startExecution(allocations)
            }

            if (response.action === 'clear') {
              resetChat()
            }
          },
          onError: () => {
            ToastHelper.error(t('error'))
          },
        }
      )
    },
    [
      messages,
      chatPayments,
      allocations,
      destinations,
      language,
      chatMutation,
      addMessage,
      mergePayments,
      setPrice,
      setAllocations,
      setSummary,
      resetChat,
      startExecution,
      t,
    ]
  )

  const handleReviewModalChange = useCallback(
    (open: boolean) => {
      if (open) {
        setReviewModalOpen(true)

        return
      }

      setReviewModalOpen(false)

      const remaining = executionQueue.slice(1)

      setExecutionQueue(remaining)

      if (remaining.length > 0) {
        const next = remaining[0]

        setAddress(next.destination.stellarAddress)
        setToken(next.destination.token)
        setCurrentAllocation(next)
        setReviewModalOpen(true)
      } else {
        setCurrentAllocation(null)
        resetChat()
        addMessage({
          id: uuid.v4(),
          role: 'assistant',
          content:
            language === 'pt-BR'
              ? 'Pagamentos enviados com sucesso! A conversa foi reiniciada. Como posso ajudar agora?'
              : 'Payments sent successfully! The conversation has been reset. How can I help now?',
          type: 'text',
          timestamp: new Date().toISOString(),
        })
      }
    },
    [executionQueue, setAddress, setToken, resetChat, addMessage, language]
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(inputText, attachedFile)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      setAttachedFile(file)
    }

    event.target.value = ''
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
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

    const file = event.dataTransfer.files[0]

    if (file) {
      setAttachedFile(file)
    }
  }

  const isLoading = chatMutation.isPending

  const allocationTotal = chatPayments.reduce(
    (sum, payment) => sum.plus(new BigNumber(payment.amount || '0')),
    new BigNumber(0)
  )

  return (
    <div
      className="relative flex flex-col min-h-[calc(100dvh-3.5rem)] lg:min-h-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-primary/10 border-2 border-dashed border-primary pointer-events-none">
          <AttachIcon className="size-10 text-primary" aria-hidden="true" />
          <p className="text-primary font-semibold text-lg">{t('dropFile')}</p>
        </div>
      )}
      <div className="flex-1 px-4 pt-6 pb-4 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map(message => (
          <div
            key={message.id}
            className={StyleHelper.merge(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={StyleHelper.merge(
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                message.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-white text-neutral-900 rounded-bl-sm shadow-sm border border-neutral-100'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {message.type === 'summary' && message.summary && message.summary.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-1.5 pr-3 font-medium text-neutral-500">
                          {t('summaryDestination')}
                        </th>
                        <th className="text-right py-1.5 pr-3 font-medium text-neutral-500">
                          {t('summaryPercentage')}
                        </th>
                        <th className="text-right py-1.5 font-medium text-neutral-500">
                          {t('summaryAmount')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {message.summary.map((item, index) => (
                        <tr key={index} className="border-b border-neutral-200">
                          <td className="py-1.5 pr-3 text-neutral-900">{item.destinationName}</td>
                          <td className="py-1.5 pr-3 text-right text-neutral-700">
                            {item.percentage}%
                          </td>
                          <td className="py-1.5 text-right font-semibold text-neutral-900 whitespace-nowrap">
                            {StringHelper.formatCurrencyAmount(item.amount, 'TESOURO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p
                className={StyleHelper.merge(
                  'text-[10px] mt-1 text-right',
                  message.role === 'user' ? 'text-white/60' : 'text-neutral-400'
                )}
              >
                {new Date(message.timestamp).toLocaleTimeString(language, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-neutral-100">
              <LoadingSpinnerIcon
                className="size-4 animate-spin text-neutral-400"
                aria-hidden="true"
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 z-10 bg-neutral-50 border-t border-neutral-100 pt-2">
      {chatPayments.length > 0 && (
        <div className="max-w-3xl mx-auto w-full px-4">
          <div className="rounded-xl bg-white border border-neutral-200 shadow-sm px-4 py-2 flex items-center justify-between text-xs text-neutral-500">
            <span>
              {t('paymentsCount', { count: chatPayments.length })}
              {' · '}
              {t('total')}:{' '}
              {StringHelper.formatCurrencyAmount(SH.formatAmount(allocationTotal), 'TESOURO')}
            </span>
            {allocations.length > 0 && (
              <span className="text-primary">
                {t('allocationsCount', { count: allocations.length })}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto w-full px-4 pb-4 pt-2">
        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-700">
            <UploadIcon className="size-4 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{attachedFile.name}</span>
            <Tooltip content={t('removeFile')}>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="ml-auto size-6 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
                aria-label={t('removeFile')}
              >
                <CloseIcon className="size-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        )}

        <form
          onSubmit={event => {
            event.preventDefault()
            void sendMessage(inputText, attachedFile)
          }}
          className="flex items-end gap-2 bg-white border border-neutral-200 rounded-2xl px-3 py-3 shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.txt"
            className="sr-only"
            aria-label={t('attachFile')}
            onChange={handleFileChange}
          />

          <Tooltip content={t('attachFile')}>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="p-2 shrink-0"
              aria-label={t('attachFile')}
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <AttachIcon className="size-5" aria-hidden="true" />
            </Button>
          </Tooltip>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={event => setInputText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            rows={1}
            maxLength={5000}
            disabled={isLoading}
            className="flex-1 bg-transparent text-neutral-900 placeholder:text-neutral-400 text-sm resize-none outline-none py-2 max-h-32 overflow-y-auto disabled:opacity-50"
            style={{ fieldSizing: 'content' } as CSSProperties}
          />

          <Tooltip content={t('send')}>
            <Button
              type="submit"
              variant="ghost"
              size="xs"
              className="p-2 shrink-0"
              aria-label={t('send')}
              disabled={isLoading || (!inputText.trim() && !attachedFile)}
            >
              {isLoading ? (
                <LoadingSpinnerIcon className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <SendIcon className="size-5 text-primary" aria-hidden="true" />
              )}
            </Button>
          </Tooltip>
        </form>
        <p className="text-xs text-neutral-400 text-center mt-2 pb-2">{t('hint')}</p>
      </div>
      </div>

      {currentAllocation && (
        <ReviewModal
          open={reviewModalOpen}
          onOpenChange={handleReviewModalChange}
          recipientAddress={currentAllocation.destination.stellarAddress}
          recipientPercentage={new BigNumber(currentAllocation.percentage).dividedBy(100)}
        />
      )}
    </div>
  )
}
