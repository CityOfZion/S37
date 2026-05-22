import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TDestination } from 'fractapay-shared'
import { StringHelper } from 'fractapay-shared'

import { Button } from '../components/Button'
import { DestinationModal } from '../components/DestinationModal'
import { Modal } from '../components/Modal'
import { Tooltip } from '../components/Tooltip'
import { ToastHelper } from '../helpers/ToastHelper'
import { useDestinationsStore } from '../hooks/use-destinations-store'

import AddIcon from '../assets/icons/add-icon.svg?react'
import DeleteIcon from '../assets/icons/delete-icon.svg?react'
import EditIcon from '../assets/icons/edit-icon.svg?react'
import EmptyStateIcon from '../assets/icons/empty-state-icon.svg?react'

export const DestinationsPage = () => {
  const { t } = useTranslation('components', { keyPrefix: 'destinations' })
  const { destinations, addDestination, updateDestination, deleteDestination } =
    useDestinationsStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDestination, setEditingDestination] = useState<TDestination | undefined>(undefined)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleAdd = () => {
    setEditingDestination(undefined)
    setModalOpen(true)
  }

  const handleEdit = (destination: TDestination) => {
    setEditingDestination(destination)
    setModalOpen(true)
  }

  const handleSave = (destination: TDestination) => {
    if (editingDestination) {
      updateDestination(destination)
      ToastHelper.success(t('updateSuccess'))
    } else {
      addDestination(destination)
      ToastHelper.success(t('addSuccess'))
    }
  }

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return

    deleteDestination(deleteConfirmId)
    setDeleteConfirmId(null)
    ToastHelper.success(t('deleteSuccess'))
  }

  const deletingDestination = destinations.find(destination => destination.id === deleteConfirmId)

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
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <EmptyStateIcon className="size-16 text-neutral-300" aria-hidden="true" />
          <div>
            <p className="text-neutral-500 font-medium">{t('empty')}</p>
            <p className="text-neutral-400 text-sm mt-1">{t('emptyHint')}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <AddIcon className="size-4" aria-hidden="true" />
            {t('add')}
          </Button>
        </div>
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
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                  {t('columns.stellarAddress')}
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
                    {destination.token === 'TESOURO' ? 'Real' : destination.token}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs hidden sm:table-cell">
                    {StringHelper.truncateMiddle(destination.pixKey, 24)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs hidden md:table-cell">
                    {StringHelper.truncateMiddle(destination.stellarAddress, 20)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip content={t('editAria', { name: destination.name })}>
                        <Button
                          variant="ghost"
                          size="xs"
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
                          className="hover:text-red-400 focus:text-red-400"
                          onClick={() => setDeleteConfirmId(destination.id)}
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
      />

      <Modal
        open={!!deleteConfirmId}
        onOpenChange={open => !open && setDeleteConfirmId(null)}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmDescription', { name: deletingDestination?.name ?? '' })}
        closeLabel={t('cancel')}
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
            {t('cancel')}
          </Button>
          <Button className="bg-red-500 hover:bg-red-600" onClick={handleDeleteConfirm}>
            {t('deleteConfirm')}
          </Button>
        </div>
      </Modal>
    </main>
  )
}
