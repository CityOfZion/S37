import { useTranslation } from 'react-i18next'

import BigNumber from 'bignumber.js'

import type { TChatMessage } from 'fractapay-shared'
import { FEE_PERCENTAGE, StringHelper } from 'fractapay-shared'

import { StyleHelper } from '../helpers/StyleHelper'
import { AiAvatar } from './AiAvatar'
import { Tooltip } from './Tooltip'
import { UserAvatar } from './UserAvatar'

import FileIcon from '../assets/icons/file-icon.svg?react'
import InfoIcon from '../assets/icons/info-icon.svg?react'
import WarningIcon from '../assets/icons/warning-icon.svg?react'

type TFeeTooltipProps = { label: string }

const FeeTooltipIcon = ({ label }: TFeeTooltipProps) => {
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

import { useState } from 'react'

type TProps = {
  message: TChatMessage
  language: string
  userName?: string | null
  userPicture?: string | null
}

export const ChatMessage = ({ message, language, userName, userPicture }: TProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'chat' })

  const isUser = message.role === 'user'

  const bubbleContent = () => {
    if (message.type === 'file-import') {
      const parts = message.content.split('\n')
      const filename = parts[parts.length - 1]
      const textPart = parts.length > 1 ? parts.slice(0, -1).join('\n') : null

      return (
        <>
          {textPart && <p className="whitespace-pre-wrap mb-1">{textPart}</p>}
          <span className="flex gap-1 text-sm font-semibold text-white/86">
            <FileIcon className="size-4 mt-0.75 shrink-0" aria-hidden="true" />
            <span className="wrap-break-word min-w-0">{filename}</span>
          </span>
        </>
      )
    }

    return <p className="whitespace-pre-wrap">{message.content}</p>
  }

  return (
    <div className={StyleHelper.merge('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {isUser ? <UserAvatar name={userName} picture={userPicture} /> : <AiAvatar />}

      <div
        className={StyleHelper.merge(
          'flex flex-col max-w-[80%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={StyleHelper.merge(
            'rounded-2xl px-4 pt-3 pb-2 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-white rounded-tr-sm shadow-sm border border-white/20'
              : 'bg-white text-neutral-900 rounded-tl-sm shadow-sm border border-neutral-100'
          )}
        >
          {bubbleContent()}

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
                isUser ? 'text-white/60' : 'text-neutral-400'
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
    </div>
  )
}
