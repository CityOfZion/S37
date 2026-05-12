import { type ChangeEvent, useEffect, useState } from 'react'
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
import { Button } from './Button'
import { Tooltip } from './Tooltip'

import AddIcon from '../assets/icons/add-icon.svg?react'
import CheckIcon from '../assets/icons/check-icon.svg?react'
import ClipboardIcon from '../assets/icons/clipboard-icon.svg?react'
import DeleteIcon from '../assets/icons/delete-icon.svg?react'
import EditIcon from '../assets/icons/edit-icon.svg?react'
import EmptyStateIcon from '../assets/icons/empty-state-icon.svg?react'
import ExecuteIcon from '../assets/icons/execute-icon.svg?react'
import SaveIcon from '../assets/icons/save-icon.svg?react'

type TProps = {
  payments: TPayment[]
  onPaymentsChange: (payments: TPayment[]) => void
}

export const PaymentList = ({ payments, onPaymentsChange }: TProps) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<TPayment | null>(null)
  const [defaultToken, setDefaultToken] = useState<TToken>()

  const copyAddress = async (address: string) => {
    await ClipboardHelper.copy(address, {
      onSuccess: () => setCopied(address),
      onAfterSuccess: () => setCopied(null),
    })
  }

  const startEditing = (payment: TPayment) => {
    setEditingPayment(cloneDeep(payment))
  }

  const cancelEditing = () => {
    setEditingPayment(null)
  }

  const saveEditing = () => {
    if (
      !editingPayment ||
      !editingPayment.address ||
      editingPayment.amount.isLessThanOrEqualTo(0)
    ) {
      return
    }

    onPaymentsChange(
      payments.map(payment =>
        payment.id === editingPayment.id ? cloneDeep(editingPayment) : payment
      )
    )

    setEditingPayment(null)
  }

  const deletePayment = (id: string) => {
    onPaymentsChange(payments.filter(payment => payment.id !== id))

    if (editingPayment?.id === id) {
      setEditingPayment(null)
    }
  }

  const addPayment = () => {
    if (!defaultToken) return

    const newPayment: TPayment = {
      id: uuid.v4(),
      address: '',
      amount: new BigNumber(0),
      token: defaultToken,
      description: '',
    }

    onPaymentsChange([...payments, newPayment])

    setEditingPayment(newPayment)
  }

  const handleEditingChange = (field: keyof TPayment, event: ChangeEvent<HTMLInputElement>) => {
    if (!editingPayment) return

    const updated = cloneDeep<TPayment>(editingPayment)
    const value = event.target.value

    if (field === 'amount') {
      let sanitized = '0'

      try {
        sanitized = value
          .replace(',', '.')
          .replace(/[^0-9.]/g, '')
          .replace(/(\.\d*)\..*/, '$1')
      } catch {
        /* empty */
      }

      updated.amount = new BigNumber(sanitized).decimalPlaces(
        STELLAR_DECIMALS,
        BigNumber.ROUND_DOWN
      )
    } else if (field === 'address') {
      updated.address = InputHelper.sanitizeAddressEvent(event)
    } else if (field === 'description') {
      updated.description = value
    }

    setEditingPayment(updated)
  }

  useEffect(() => {
    if (!defaultToken && payments.length > 0) setDefaultToken(payments[0].token)
  }, [defaultToken, payments])

  if (payments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <EmptyStateIcon className="size-12 mx-auto mb-4 opacity-30" aria-hidden="true" />
        <p>{t('payments.empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">{t('payments.title')}</h2>
        <p className="text-sm text-gray-400">{t('payments.count', { count: payments.length })}</p>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('payments.address')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('payments.amount')}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">
                {t('payments.description')}
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-24">
                {t('payments.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.map(payment =>
              editingPayment?.id === payment.id ? (
                <tr key={payment.id} className="bg-white/5">
                  <td className="px-4 py-3">
                    <input
                      name="address"
                      aria-label={t('payments.address')}
                      placeholder={t('payments.address')}
                      type="text"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                      value={editingPayment.address}
                      onChange={event => handleEditingChange('address', event)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      name="amount"
                      aria-label={t('payments.amount')}
                      placeholder={t('payments.amount')}
                      type="text"
                      inputMode="decimal"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                      maxLength={20}
                      value={editingPayment.amount.toFixed()}
                      onChange={event => handleEditingChange('amount', event)}
                    />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <input
                      name="description"
                      aria-label={t('payments.description')}
                      placeholder={t('payments.description')}
                      type="text"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                      value={editingPayment.description || ''}
                      onChange={event => handleEditingChange('description', event)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip content={t('payments.save')}>
                        <Button
                          variant="ghost"
                          onClick={saveEditing}
                          aria-label={t('payments.save')}
                        >
                          <SaveIcon className="size-4 text-green-400" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t('payments.cancel')}>
                        <Button
                          variant="ghost"
                          onClick={cancelEditing}
                          aria-label={t('payments.cancel')}
                        >
                          <DeleteIcon className="size-4 text-red-400" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-300">
                        {StringHelper.truncateMiddle(payment.address, 20)}
                      </span>
                      <Tooltip content={t('payments.copy')}>
                        <Button
                          variant="ghost"
                          onClick={() => void copyAddress(payment.address)}
                          className="shrink-0"
                          aria-label={t('payments.copy')}
                        >
                          {copied === payment.address ? (
                            <CheckIcon className="size-4 text-green-400" aria-hidden="true" />
                          ) : (
                            <ClipboardIcon className="size-4" aria-hidden="true" />
                          )}
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-white">{payment.amount.toFixed()}</span>
                    <span className="text-gray-500 text-sm ml-1">{payment.token}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm hidden md:table-cell">
                    {payment.description || EMPTY_COLUMN}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip content={t('payments.edit')}>
                        <Button
                          variant="ghost"
                          onClick={() => startEditing(payment)}
                          aria-label={t('payments.edit')}
                        >
                          <EditIcon className="size-4" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t('payments.delete')}>
                        <Button
                          variant="ghost"
                          onClick={() => deletePayment(payment.id)}
                          aria-label={t('payments.delete')}
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

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={addPayment}>
          <AddIcon className="size-4" aria-hidden="true" />
          {t('payments.addPayment')}
        </Button>

        <Button className="flex-1">
          <ExecuteIcon className="size-5" aria-hidden="true" />
          {t('payments.execute')}
        </Button>
      </div>
    </div>
  )
}
