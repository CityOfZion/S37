import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isAxiosError } from 'axios'

import type { TDestination } from 'fractapay-shared'
import { TOKEN } from 'fractapay-shared'

import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { Tooltip } from '../../components/Tooltip'
import { InputHelper } from '../../helpers/InputHelper'
import { ToastHelper } from '../../helpers/ToastHelper'
import { useAddDestinationMutation } from '../../hooks/use-add-destination-mutation'
import { useBreadcrumb } from '../../hooks/use-breadcrumb-store'
import { useDeleteDestinationMutation } from '../../hooks/use-delete-destination-mutation'
import { useDestinationsStore } from '../../hooks/use-destinations-store'
import { usePageTitle } from '../../hooks/use-page-title'
import { useUpdateDestinationMutation } from '../../hooks/use-update-destination-mutation'
import { DestinationModal } from '../../modals/DestinationModal'

import AddIcon from '../../assets/icons/add-icon.svg?react'
import BrazilFlagIcon from '../../assets/icons/brazil-flag-icon.svg?react'
import DeleteIcon from '../../assets/icons/delete-icon.svg?react'
import EditIcon from '../../assets/icons/edit-icon.svg?react'
import EmptyStateIcon from '../../assets/icons/empty-state-icon.svg?react'

export const DestinationsPage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'destinations' })
  const { t: tCommon } = useTranslation('common')
  usePageTitle(t('title'))
  useBreadcrumb([{ label: t('title') }])
  const { destinations } = useDestinationsStore()
  const addDestinationMutation = useAddDestinationMutation()
  const updateDestinationMutation = useUpdateDestinationMutation()
  const deleteDestinationMutation = useDeleteDestinationMutation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDestination, setEditingDestination] = useState<TDestination | undefined>(undefined)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const deletingNameRef = useRef<string>('')

  const isSaving = addDestinationMutation.isPending || updateDestinationMutation.isPending

  const openDeleteConfirm = (id: string) => {
    deletingNameRef.current = destinations.find(destination => destination.id === id)?.name ?? ''
    setDeleteConfirmId(id)
  }

  const handleAdd = () => {
    setEditingDestination(undefined)
    setModalOpen(true)
  }

  const handleEdit = (destination: TDestination) => {
    setEditingDestination(destination)
    setModalOpen(true)
  }

  const handleSave = (data: Omit<TDestination, 'id'>) => {
    if (editingDestination) {
      updateDestinationMutation.mutate(
        { id: editingDestination.id, ...data },
        {
          onSuccess: () => {
            ToastHelper.success(t('updateSuccess'))
            setModalOpen(false)
          },
          onError: error => {
            const code: string | undefined = isAxiosError(error)
              ? error.response?.data?.error
              : undefined

            ToastHelper.error(t(code || 'saveError', { defaultValue: t('saveError') }))
          },
        }
      )
    } else {
      addDestinationMutation.mutate(data, {
        onSuccess: () => {
          ToastHelper.success(t('addSuccess'))
          setModalOpen(false)
        },
        onError: error => {
          const code: string | undefined = isAxiosError(error)
            ? error.response?.data?.error
            : undefined

          ToastHelper.error(t(code || 'saveError', { defaultValue: t('saveError') }))
        },
      })
    }
  }

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return

    deleteDestinationMutation.mutate(deleteConfirmId, {
      onSuccess: () => {
        setDeleteConfirmId(null)
        ToastHelper.success(t('deleteSuccess'))
      },
      onError: () => ToastHelper.error(t('deleteError')),
    })
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{t('title')}</h2>
          <p className="text-neutral-500 text-sm mt-1">{t('description')}</p>
        </div>

        <Button
          onClick={handleAdd}
          size="sm"
          className="max-sm:size-11 max-sm:min-w-11 max-sm:max-w-11 max-sm:p-0"
          aria-label={t('add')}
        >
          <AddIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('add')}</span>
        </Button>
      </div>

      {destinations.length === 0 ? (
        <EmptyState icon={EmptyStateIcon} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('columns.name')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('columns.coin')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                  {t('columns.pixKey')}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {destinations.map(destination => (
                <tr key={destination.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-900">{destination.name}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    <span className="flex items-center gap-2">
                      {destination.token === TOKEN.TESOURO && (
                        <BrazilFlagIcon className="size-4 shrink-0 rounded-sm" aria-hidden="true" />
                      )}
                      {destination.token === TOKEN.TESOURO
                        ? tCommon(`fiatByToken.${destination.token}`)
                        : destination.token}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs hidden sm:table-cell">
                    {InputHelper.maskPixKeyDisplay(destination.pixKey, destination.pixKeyType)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip content={t('editAria', { name: destination.name })}>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="hover:bg-transparent active:bg-transparent focus:bg-transparent"
                          aria-label={t('editAria', { name: destination.name })}
                          onClick={() => handleEdit(destination)}
                        >
                          <EditIcon className="size-4" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t('deleteAria', { name: destination.name })}>
                        <Button
                          variant="ghost"
                          size="xs"
                          aria-label={t('deleteAria', { name: destination.name })}
                          className="hover:text-red-400 focus:text-red-400 hover:bg-transparent active:bg-transparent focus:bg-transparent"
                          onClick={() => openDeleteConfirm(destination.id)}
                        >
                          <DeleteIcon className="size-4" aria-hidden="true" />
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DestinationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        destination={editingDestination}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <Modal
        open={!!deleteConfirmId}
        onOpenChange={open => !open && setDeleteConfirmId(null)}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmDescription', { name: deletingNameRef.current })}
        closeLabel={t('cancel')}
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
            {t('cancel')}
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600"
            disabled={deleteDestinationMutation.isPending}
            onClick={handleDeleteConfirm}
          >
            {t('deleteConfirm')}
          </Button>
        </div>
      </Modal>
    </main>
  )
}
