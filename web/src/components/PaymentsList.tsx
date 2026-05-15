import { ChangeEvent, type KeyboardEvent, useMemo, useState } from 'react'
import { Controller, ControllerRenderProps, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import BigNumber from 'bignumber.js'
import * as uuid from 'uuid'

import type { TPayment } from 'fractapay-shared'
import { FEE_PERCENTAGE, RECIPIENT_PERCENTAGE, StringHelper } from 'fractapay-shared'

import { EMPTY_COLUMN } from '../constants'
import { InputHelper } from '../helpers/InputHelper'
import { useDebounce } from '../hooks/use-debounce'
import { usePaymentsStore } from '../hooks/use-payments-store'
import { paymentEditSchema, type TPaymentEditFormValues } from '../schemas/payments-schema'
import { Button } from './Button'
import { Info } from './Info'
import { Input } from './Input'
import { ReviewModal } from './ReviewModal'
import { Tooltip } from './Tooltip'

import AddIcon from '../assets/icons/add-icon.svg?react'
import CheckIcon from '../assets/icons/check-icon.svg?react'
import CloseIcon from '../assets/icons/close-icon.svg?react'
import DeleteIcon from '../assets/icons/delete-icon.svg?react'
import EditIcon from '../assets/icons/edit-icon.svg?react'
import EmptyStateIcon from '../assets/icons/empty-state-icon.svg?react'
import ExecuteIcon from '../assets/icons/execute-icon.svg?react'
import InfoIcon from '../assets/icons/info-icon.svg?react'

export const PaymentsList = () => {
  const { t } = useTranslation('components', { keyPrefix: 'paymentsList' })
  const { payments, token, address, ...paymentsStore } = usePaymentsStore()
  const { debounce, isDebouncePending } = useDebounce()
  const [editingPayment, setEditingPayment] = useState<TPayment | null>(null)
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    trigger,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<TPaymentEditFormValues>({
    resolver: zodResolver(paymentEditSchema),
    defaultValues: { description: '' },
    mode: 'onChange',
  })

  const isAddPaymentInvalid = !!editingPayment
  const isSavePaymentInvalid = !isValid || isDebouncePending || !editingPayment

  const discardAddingPayment = () => {
    if (isAddingPayment && editingPayment) {
      paymentsStore.deletePayment(editingPayment.id)

      setIsAddingPayment(false)
    }
  }

  const startEditing = (payment: TPayment) => {
    discardAddingPayment()
    setEditingPayment(payment)

    reset({
      amount: payment.amount,
      description: payment.description || '',
    })

    trigger()
  }

  const cancelEditing = () => {
    discardAddingPayment()
    setEditingPayment(null)
  }

  const deletePayment = (id: string) => {
    paymentsStore.deletePayment(id)

    if (editingPayment?.id === id) {
      setEditingPayment(null)
      setIsAddingPayment(false)
    }
  }

  const addPayment = () => {
    if (isAddPaymentInvalid) return

    const newPayment: TPayment = {
      id: uuid.v4(),
      amount: '',
      description: '',
    }

    paymentsStore.addPayment(newPayment)

    reset({ amount: newPayment.amount, description: newPayment.description })
    trigger()

    setIsAddingPayment(true)
    setEditingPayment(newPayment)
  }

  const saveSubmit = (values: TPaymentEditFormValues) => {
    if (isSavePaymentInvalid) return

    paymentsStore.updatePayment({
      ...editingPayment,
      amount: StringHelper.formatAmount(values.amount),
      description: values.description,
    })

    setEditingPayment(null)
    setIsAddingPayment(false)
  }

  const saveEditing = handleSubmit(saveSubmit)

  const handleAmountChange = (
    event: ChangeEvent<HTMLInputElement>,
    field: ControllerRenderProps<TPaymentEditFormValues, 'amount'>
  ) => {
    field.onChange(InputHelper.sanitizeAmountEvent(event))

    debounce(() => {
      const current = getValues('amount')
      const formatted = StringHelper.formatAmount(current)

      if (formatted !== current) {
        setValue('amount', formatted, { shouldValidate: true })
      }
    })
  }

  const handleEditingKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isSavePaymentInvalid && event.key === 'Enter') saveEditing()
  }

  const totalAmount = useMemo(() => {
    const sum = payments.reduce(
      (accumulator, payment) => accumulator.plus(new BigNumber(payment.amount)),
      new BigNumber('0')
    )

    return StringHelper.formatAmount(sum)
  }, [payments])

  const recipientAmount = useMemo(
    () => StringHelper.formatAmount(new BigNumber(totalAmount).times(RECIPIENT_PERCENTAGE)),
    [totalAmount]
  )

  const totalToPay = useMemo(
    () =>
      StringHelper.formatAmount(
        new BigNumber(recipientAmount).times(new BigNumber('1').plus(FEE_PERCENTAGE))
      ),
    [recipientAmount]
  )

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
                    <Controller
                      name="amount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          name={field.name}
                          aria-label={t('amount')}
                          placeholder={t('amount')}
                          type="text"
                          autoFocus
                          inputMode="decimal"
                          className="p-2 text-sm min-w-32 text-right"
                          maxLength={12}
                          value={field.value}
                          error={!!errors.amount}
                          onKeyDown={handleEditingKeyDown}
                          onChange={event => handleAmountChange(event, field)}
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <Input
                          name={field.name}
                          aria-label={t('description')}
                          placeholder={t('description')}
                          type="text"
                          className="p-2 text-sm min-w-32"
                          maxLength={200}
                          value={field.value}
                          error={!!errors.description}
                          onKeyDown={handleEditingKeyDown}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip content={t('save')}>
                        <Button
                          aria-label={t('save')}
                          variant="ghost"
                          disabled={isSavePaymentInvalid}
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-semibold text-white">
                      {StringHelper.formatCurrencyAmount(payment.amount, token)}
                    </span>
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
          <tfoot className="bg-white/10">
            <tr>
              <td
                className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap"
                colSpan={2}
              >
                {StringHelper.formatCurrencyAmount(totalAmount, token)}
              </td>
              <td className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                <span className="inline-flex items-center gap-1">
                  {t('subtotal')}
                  <Info content={t('subtotalInfo')} icon={<InfoIcon aria-hidden="true" />} />
                </span>
              </td>
            </tr>
            <tr className="bg-white/5">
              <td
                className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap"
                colSpan={2}
              >
                {StringHelper.formatCurrencyAmount(recipientAmount, token)}
              </td>
              <td className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                <span className="inline-flex items-center gap-1">
                  {t('recipient', { percentage: RECIPIENT_PERCENTAGE.times(100).toFixed(0) })}
                  <Info content={t('recipientInfo')} icon={<InfoIcon aria-hidden="true" />} />
                </span>
              </td>
            </tr>
            <tr className="bg-white/10">
              <td
                className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap"
                colSpan={2}
              >
                {StringHelper.formatCurrencyAmount(totalToPay, token)}
              </td>
              <td className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                <span className="inline-flex items-center gap-1">
                  {t('total')}
                  <Info content={t('totalInfo')} icon={<InfoIcon aria-hidden="true" />} />
                </span>
              </td>
            </tr>
          </tfoot>
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

        <Button
          className="flex-1"
          disabled={!!editingPayment || !address}
          onClick={() => setIsReviewOpen(true)}
        >
          <ExecuteIcon className="size-4" aria-hidden="true" />
          {t('reviewAndConfirm')}
        </Button>
      </div>

      {address && (
        <ReviewModal
          open={isReviewOpen}
          onOpenChange={setIsReviewOpen}
          recipientAddress={address}
        />
      )}
    </div>
  )
}
