import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useQueryClient } from '@tanstack/react-query'

import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ToastHelper } from '../../helpers/ToastHelper'
import { useBreadcrumb } from '../../hooks/use-breadcrumb-store'
import { usePageTitle } from '../../hooks/use-page-title'
import { USER_QUERY_KEY, useUserQuery } from '../../hooks/use-user-query'
import { server } from '../../services/server'

export const ProfilePage = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'profile' })
  usePageTitle(t('title'))
  useBreadcrumb([{ label: t('title') }])
  const { data: user } = useUserQuery()
  const queryClient = useQueryClient()

  const [name, setName] = useState(user?.name || '')
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  const validate = (value: string) => {
    if (!value.trim()) return t('nameRequired')

    return undefined
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    const error = validate(trimmed)

    if (error) {
      setNameError(error)

      return
    }

    setNameError(undefined)
    setIsSaving(true)

    try {
      await server.patch('/auth/profile', { name: trimmed })
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY })
      setName(trimmed)
      ToastHelper.success(t('saveSuccess'))
    } catch {
      ToastHelper.error(t('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const initials = (user?.name || '?').charAt(0).toUpperCase()

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-sm text-neutral-500 mt-1">{t('subtitle')}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-4">
          {user?.picture ? (
            <img
              src={user.picture}
              alt=""
              referrerPolicy="no-referrer"
              className="size-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="size-16 rounded-full bg-primary text-white font-bold text-2xl flex items-center justify-center shrink-0">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 truncate">{user?.name}</p>
            <p className="text-sm text-neutral-500 truncate">{user?.email}</p>
          </div>
        </div>

        <form
          onSubmit={event => {
            event.preventDefault()
            void handleSave()
          }}
          className="space-y-4"
        >
          <Input
            label={t('nameLabel')}
            value={name}
            onChange={event => {
              setName(event.target.value)
              if (nameError) setNameError(validate(event.target.value))
            }}
            placeholder={t('namePlaceholder')}
            maxLength={200}
            error={nameError}
            required
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
