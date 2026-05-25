import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useBlocker } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import type { TChatMessage, TDestinationAllocation } from 'fractapay-shared'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_INPUT_ACCEPT,
  ALLOWED_MIME_TYPES,
  FEE_PERCENTAGE,
  StringHelper,
} from 'fractapay-shared'

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
import FileIcon from '../assets/icons/file-icon.svg?react'
import InfoIcon from '../assets/icons/info-icon.svg?react'
import LoadingSpinnerIcon from '../assets/icons/loading-spinner-icon.svg?react'
import SendIcon from '../assets/icons/send-icon.svg?react'
import WarningIcon from '../assets/icons/warning-icon.svg?react'

const FeeTooltipIcon = ({ label }: { label: string }) => {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip content={label} open={open} onOpenChange={setOpen}>
      <span
        tabIndex={0}
        className="inline-flex cursor-pointer"
        aria-label={label}
        onClick={() => setOpen(previous => !previous)}
        onKeyDown={event => event.key === 'Enter' && setOpen(previous => !previous)}
      >
        <InfoIcon className="size-3 text-neutral-400" aria-hidden="true" />
      </span>
    </Tooltip>
  )
}

const isFileAllowed = (file: File): boolean => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  return (
    ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number]) ||
    ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])
  )
}

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
  } = usePaymentsStore()

  const eligibleDestinations = useMemo(
    () => destinations.filter(destination => destination.token === paymentToken),
    [destinations, paymentToken]
  )
  const chatMutation = useChatMutation()
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [executionQueue, setExecutionQueue] = useState<TDestinationAllocation[]>([])
  const [executionKey, setExecutionKey] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastFileRef = useRef<File | null>(null)
  const lastTextRef = useRef<string>('')
  const isLanguageMounted = useRef(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const isLoading = chatMutation.isPending
  const isLoadingRef = useRef(false)

  useEffect(() => {
    isLoadingRef.current = isLoading
  })

  const shouldBlockNavigation = useCallback(() => {
    if (!isLoadingRef.current) return false

    ToastHelper.info(t('navigatingWhileLoading'))

    return true
  }, [t])

  useBlocker({ shouldBlockFn: shouldBlockNavigation, enableBeforeUnload: false })

  useEffect(() => {
    if (!isLoading) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isLoading])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

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

    const { messages } = useChatStore.getState()

    if (messages.length !== 1) return

    updateMessage(messages[0].id, { content: t('greeting') })
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const startExecution = useCallback(
    (queue: TDestinationAllocation[]) => {
      if (queue.length === 0) return

      const first = queue[0]

      setStorePayments(chatPayments)
      setStorePrice(price)
      setToken(first.destination.token)
      setExecutionQueue(queue)
      setExecutionKey(previous => previous + 1)
      setReviewModalOpen(true)
    },
    [chatPayments, price, setStorePayments, setStorePrice, setToken]
  )

  const sendMessage = useCallback(
    async (text: string, file?: File | null) => {
      if (!text.trim() && !file) return

      const userMessageContent = file
        ? text.trim()
          ? `${text.trim()}\n${file.name}`
          : file.name
        : text.trim()

      const userMessage: TChatMessage = {
        id: uuid.v4(),
        role: 'user',
        content: userMessageContent,
        type: file ? 'file-import' : 'text',
        timestamp: new Date().toISOString(),
      }

      if (file) {
        lastFileRef.current = file
        lastTextRef.current = text.trim()
      }

      addMessage(userMessage)
      setDraftMessage('')
      setAttachedFile(null)

      const conversationHistory = [
        ...messages.map(message => ({ role: message.role, content: message.content })),
        { role: 'user' as const, content: userMessageContent },
      ]

      setIsProcessing(true)

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

            const assistantMessage: TChatMessage = {
              id: uuid.v4(),
              role: 'assistant',
              content,
              type: response.action === 'request_confirmation' ? 'summary' : 'text',
              summary: response.summary,
              timestamp: new Date().toISOString(),
            }

            addMessage(assistantMessage)

            if (response.errorCode && lastFileRef.current) {
              setAttachedFile(lastFileRef.current)
              if (lastTextRef.current) setDraftMessage(lastTextRef.current)
            }

            requestAnimationFrame(() => textareaRef.current?.focus())

            if (
              response.action === 'add_payments' &&
              response.payments &&
              response.payments.length > 0
            ) {
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

            if (response.action === 'execute') {
              startExecution(allocations)
            }

            if (response.action === 'clear') {
              resetChat()
            }
          },
          onSettled: () => {
            setIsProcessing(false)
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
      t,
    ]
  )

  const handleReviewModalChange = useCallback((open: boolean) => {
    if (open) return

    setReviewModalOpen(false)
    setExecutionQueue([])
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(draftMessage, attachedFile)
    }
  }

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
              'flex flex-col',
              message.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 px-1 select-none">
              {message.role === 'user' ? t('roleUser') : t('roleAssistant')}
            </p>
            <div
              className={StyleHelper.merge(
                'max-w-[85%] rounded-2xl px-4 pt-3 pb-2 text-sm leading-relaxed',
                message.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-white text-neutral-900 rounded-bl-sm shadow-sm border border-neutral-100'
              )}
            >
              {message.type === 'file-import' ? (
                (() => {
                  const parts = message.content.split('\n')
                  const filename = parts[parts.length - 1]
                  const textPart = parts.length > 1 ? parts.slice(0, -1).join('\n') : null

                  return (
                    <>
                      {textPart && <p className="whitespace-pre-wrap mb-1">{textPart}</p>}
                      <span className="flex items-center gap-1 text-sm font-medium text-white/90">
                        <FileIcon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{filename}</span>
                      </span>
                    </>
                  )
                })()
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}

              {message.type === 'summary' && (!message.summary || message.summary.length === 0) && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-warning-500 font-medium">
                  <WarningIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  {t('summaryEmpty')}
                </p>
              )}

              {message.type === 'summary' && message.summary && message.summary.length > 0 && (
                <div className="my-2 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-t border-b border-neutral-200">
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
                        <tr key={index} className="border-b border-neutral-100">
                          <td className="py-1.5 pr-3 text-neutral-900">{item.destinationName}</td>
                          <td className="py-1.5 pr-3 text-right text-neutral-500">
                            {item.percentage}%
                          </td>
                          <td className="py-1.5 text-right text-neutral-900 whitespace-nowrap">
                            {StringHelper.formatCurrencyAmount(item.amount, item.token)}
                          </td>
                        </tr>
                      ))}
                      {message.summary.length > 0 &&
                        message.summary[0].feeAmount &&
                        (() => {
                          const summaryToken = message.summary[0].token
                          const fee = FEE_PERCENTAGE.times(100).toFixed(0)
                          const feeLabel = t('summaryFeeTooltip', { fee })

                          return (
                            <>
                              <tr className="border-b border-neutral-100">
                                <td className="py-1.5 pr-3 text-neutral-500">
                                  <span className="flex items-center gap-1">
                                    {t('summaryFee')}
                                    <FeeTooltipIcon label={feeLabel} />
                                  </span>
                                </td>
                                <td className="py-1.5 pr-3 text-right text-neutral-500">{`${fee}%`}</td>
                                <td className="py-1.5 text-right text-neutral-500 whitespace-nowrap">
                                  ~
                                  {StringHelper.formatCurrencyAmount(
                                    StringHelper.formatAmount(
                                      message.summary.reduce(
                                        (sum, item) => sum.plus(item.feeAmount ?? '0'),
                                        new BigNumber(0)
                                      )
                                    ),
                                    summaryToken
                                  )}
                                </td>
                              </tr>
                              <tr className="border-b border-neutral-100">
                                <td className="py-1.5 pr-3 font-bold text-neutral-900" colSpan={2}>
                                  {t('summaryTotal')}
                                </td>
                                <td className="py-1.5 text-right font-bold text-neutral-900 whitespace-nowrap">
                                  {StringHelper.formatCurrencyAmount(
                                    StringHelper.formatAmount(
                                      message.summary.reduce(
                                        (sum, item) => sum.plus(item.totalAmount ?? '0'),
                                        new BigNumber(0)
                                      )
                                    ),
                                    summaryToken
                                  )}
                                </td>
                              </tr>
                            </>
                          )
                        })()}
                    </tbody>
                  </table>
                </div>
              )}

              <Tooltip
                content={new Date(message.timestamp).toLocaleString(language, {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              >
                <p
                  className={StyleHelper.merge(
                    'text-[10px] mt-1 text-right select-none cursor-default w-fit ml-auto mr-0',
                    message.role === 'user' ? 'text-white/60' : 'text-neutral-400'
                  )}
                >
                  {new Date(message.timestamp).toLocaleTimeString(language, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </Tooltip>
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
            <div className="rounded-xl bg-white border border-neutral-200 shadow-sm px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-neutral-500 select-none">
              <span>
                {t('paymentsCount', { count: chatPayments.length })}
                {' • '}
                {t('total')}:{' '}
                {StringHelper.formatCurrencyAmount(
                  StringHelper.formatAmount(allocationTotal),
                  paymentToken
                )}
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
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-500">
              <FileIcon className="size-4 text-primary shrink-0" aria-hidden="true" />
              <span className="truncate select-none">{attachedFile.name}</span>
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
              void sendMessage(draftMessage, attachedFile)
            }}
            className="flex items-end gap-2 bg-white border border-neutral-200 rounded-2xl px-3 py-3 shadow-sm"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_INPUT_ACCEPT}
              className="sr-only"
              tabIndex={-1}
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
              name="message"
              ref={textareaRef}
              value={draftMessage}
              onChange={event => setDraftMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              aria-label={t('placeholder')}
              rows={1}
              maxLength={5000}
              disabled={isLoading}
              className="flex-1 bg-transparent text-neutral-900 placeholder:text-neutral-400 text-sm resize-none py-2 max-h-32 overflow-y-auto disabled:opacity-50 focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ fieldSizing: 'content' } as CSSProperties}
            />

            <Tooltip content={t('send')}>
              <Button
                type="submit"
                variant="ghost"
                size="xs"
                className="p-2 shrink-0"
                aria-label={t('send')}
                disabled={isLoading || (!draftMessage.trim() && !attachedFile)}
              >
                {isLoading ? (
                  <LoadingSpinnerIcon className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <SendIcon className="size-5 text-primary" aria-hidden="true" />
                )}
              </Button>
            </Tooltip>
          </form>
          <p className="text-xs text-neutral-400 text-center mt-2 pb-2 select-none">{t('hint')}</p>
        </div>
      </div>

      {executionQueue.length > 0 && (
        <ReviewModal
          key={executionKey}
          open={reviewModalOpen}
          onOpenChange={handleReviewModalChange}
          recipientAddress={address}
          allocations={executionQueue}
          onPaymentCompleted={resetChat}
        />
      )}
    </div>
  )
}
