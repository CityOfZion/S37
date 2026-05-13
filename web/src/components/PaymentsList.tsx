import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import BigNumber from 'bignumber.js'
import { cloneDeep } from 'lodash'
import * as uuid from 'uuid'

import type { TPayment, TToken } from 'fractapay-shared'
import { STELLAR_DECIMALS } from 'fractapay-shared'

import { EMPTY_COLUMN } from '../constants'
import { ClipboardHelper } from '../helpers/ClipboardHelper'
import { InputHelper } from '../helpers/InputHelper'
import { StringHelper } from '../helpers/StringHelper'
import { ToastHelper } from '../helpers/ToastHelper'
import { useDebounce } from '../hooks/useDebounce'
import { Button } from './Button'
import { Input } from './Input'
import { Tooltip } from './Tooltip'

import AddIcon from '../assets/icons/add-icon.svg?react'
import CheckIcon from '../assets/icons/check-icon.svg?react'
import ClipboardIcon from '../assets/icons/clipboard-icon.svg?react'
import CloseIcon from '../assets/icons/close-icon.svg?react'
import DeleteIcon from '../assets/icons/delete-icon.svg?react'
import EditIcon from '../assets/icons/edit-icon.svg?react'
import EmptyStateIcon from '../assets/icons/empty-state-icon.svg?react'
import ExecuteIcon from '../assets/icons/execute-icon.svg?react'

type TProps = {
  payments: TPayment[]
  onPaymentsChange: (payments: TPayment[]) => void
}

export const PaymentsList = ({ payments, onPaymentsChange }: TProps) => {
  const { t } = useTranslation('components', { keyPrefix: 'paymentsList' })
  const { debounce, isDebouncePending } = useDebounce()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<TPayment | null>(null)
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [defaultToken, setDefaultToken] = useState<TToken>()

  const hasEditingAddressError = useMemo(
    () =>
      !!editingPayment &&
      (!editingPayment.address || !InputHelper.isValidAddress(editingPayment.address)),
    [editingPayment]
  )

  const isEditingInvalid = useMemo(
    () =>
      !editingPayment ||
      hasEditingAddressError ||
      editingPayment.amount.isLessThanOrEqualTo(0) ||
      isDebouncePending,
    [hasEditingAddressError, editingPayment, isDebouncePending]
  )

  const isAddPaymentInvalid = !defaultToken || !!editingPayment || isAddingPayment

  const copyAddress = async (payment: TPayment) => {
    await ClipboardHelper.copy(payment.address, {
      onSuccess: () => {
        setCopiedId(payment.id)
        ToastHelper.success(t('copySuccess'))
      },
      onAfterSuccess: () => setCopiedId(null),
    })
  }

  const discardAddingPayment = () => {
    if (isAddingPayment && editingPayment) {
      onPaymentsChange(payments.filter(payment => payment.id !== editingPayment.id))
      setIsAddingPayment(false)
    }
  }

  const startEditing = (payment: TPayment) => {
    discardAddingPayment()
    setEditingPayment(cloneDeep(payment))
  }

  const cancelEditing = () => {
    discardAddingPayment()
    setEditingPayment(null)
  }

  const saveEditing = () => {
    if (isEditingInvalid) {
      return
    }

    onPaymentsChange(
      payments.map(payment =>
        payment.id === editingPayment?.id ? cloneDeep(editingPayment) : payment
      )
    )

    setIsAddingPayment(false)
    setEditingPayment(null)
  }

  const deletePayment = (id: string) => {
    onPaymentsChange(payments.filter(payment => payment.id !== id))
  }

  const addPayment = () => {
    if (isAddPaymentInvalid) return

    const newPayment: TPayment = {
      id: uuid.v4(),
      address: '',
      amount: new BigNumber('1'),
      token: defaultToken,
      description: '',
    }

    onPaymentsChange([...payments, newPayment])

    setIsAddingPayment(true)
    setEditingPayment(newPayment)
  }

  const handleEditingKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') saveEditing()
  }

  const handleEditingAddressPaste = (value: string) => {
    setEditingPayment(previous => {
      if (!previous) return previous

      previous.address = value

      return cloneDeep(previous)
    })
  }

  const handleEditingAddressChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEditingPayment(previous => {
      if (!previous) return previous

      previous.address = InputHelper.sanitizeAddressEvent(event)

      return cloneDeep(previous)
    })
  }

  const handleEditingAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    debounce(() => {
      setEditingPayment(previous => {
        if (!previous) return previous

        const amount = previous.amount.isLessThanOrEqualTo('0')
          ? new BigNumber('1')
          : previous.amount

        previous.amount = amount.decimalPlaces(STELLAR_DECIMALS, BigNumber.ROUND_DOWN)

        return cloneDeep(previous)
      })
    })

    setEditingPayment(previous => {
      if (!previous) return previous

      try {
        previous.amount = new BigNumber(event.target.value)
      } catch {
        if (previous.amount.toFixed().length === 1) previous.amount = new BigNumber('1')
      }

      return cloneDeep(previous)
    })
  }

  const handleEditingDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEditingPayment(previous => {
      if (!previous) return previous

      previous.description = event.target.value

      return cloneDeep(previous)
    })
  }

  useEffect(() => {
    if (!defaultToken && payments.length > 0) setDefaultToken(payments[0].token)
  }, [defaultToken, payments])

  if (payments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <EmptyStateIcon className="size-12 mx-auto mb-4 opacity-30" aria-hidden="true" />
        <p>{t('empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">{t('title')}</h2>
        <p className="text-sm text-gray-400">{t('count', { count: payments.length })}</p>
      </div>

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('address')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('amount')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('description')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-24">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.map(payment =>
              editingPayment?.id === payment.id ? (
                <tr key={payment.id} className="bg-white/5">
                  <td className="px-4 py-3">
                    <Input
                      name="address"
                      aria-label={t('address')}
                      placeholder={t('address')}
                      type="text"
                      className="p-2 text-sm min-w-32 pr-8"
                      pasteClassName="right-2"
                      value={editingPayment.address}
                      error={hasEditingAddressError}
                      autoFocus
                      onKeyDown={handleEditingKeyDown}
                      onPaste={handleEditingAddressPaste}
                      onChange={handleEditingAddressChange}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      name="amount"
                      aria-label={t('amount')}
                      placeholder={t('amount')}
                      type="text"
                      inputMode="decimal"
                      className="p-2 text-sm min-w-32 text-right"
                      maxLength={16}
                      value={editingPayment.amount.toFixed()}
                      onKeyDown={handleEditingKeyDown}
                      onChange={handleEditingAmountChange}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      name="description"
                      aria-label={t('description')}
                      placeholder={t('description')}
                      type="text"
                      className="p-2 text-sm min-w-32"
                      maxLength={200}
                      value={editingPayment.description || ''}
                      onKeyDown={handleEditingKeyDown}
                      onChange={handleEditingDescriptionChange}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip content={t('save')}>
                        <Button
                          aria-label={t('save')}
                          variant="ghost"
                          disabled={isEditingInvalid}
                          onClick={saveEditing}
                        >
                          <CheckIcon className="size-4 text-green-400" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t('cancel')}>
                        <Button aria-label={t('cancel')} variant="ghost" onClick={cancelEditing}>
                          <CloseIcon className="size-4 text-red-400" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr
                  key={payment.id}
                  className="hover:bg-white/5 focus:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Tooltip content={payment.address}>
                        <span className="font-mono text-sm text-gray-300">
                          {StringHelper.truncateMiddle(payment.address, 20)}
                        </span>
                      </Tooltip>
                      <Tooltip content={t('copy')}>
                        <Button
                          aria-label={t('copy')}
                          variant="ghost"
                          className="shrink-0"
                          onClick={copyAddress.bind(null, payment)}
                        >
                          {copiedId === payment.id ? (
                            <CheckIcon className="size-4 text-green-400" aria-hidden="true" />
                          ) : (
                            <ClipboardIcon className="size-4" aria-hidden="true" />
                          )}
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-semibold text-white">{payment.amount.toFixed()}</span>
                    <span className="text-gray-500 text-xs">{` ${payment.token}`}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm min-w-56 break-all">
                    {payment.description || EMPTY_COLUMN}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip content={t('edit')}>
                        <Button
                          aria-label={t('edit')}
                          variant="ghost"
                          onClick={startEditing.bind(null, payment)}
                        >
                          <EditIcon className="size-4" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t('delete')}>
                        <Button
                          aria-label={t('delete')}
                          variant="ghost"
                          onClick={deletePayment.bind(null, payment.id)}
                        >
                          <DeleteIcon className="size-4 text-red-400" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 flex-col md:flex-row">
        <Button
          variant="outline"
          className="flex-1"
          disabled={isAddPaymentInvalid}
          onClick={addPayment}
        >
          <AddIcon className="size-4" aria-hidden="true" />
          {t('addPayment')}
        </Button>

        <Button className="flex-1" disabled={!!editingPayment}>
          <ExecuteIcon className="size-4" aria-hidden="true" />
          {t('execute')}
        </Button>
      </div>
    </div>
  )
}
