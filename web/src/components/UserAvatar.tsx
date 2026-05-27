import { useEffect, useState } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'

const avatarCache = new Map<string, string>()
const pendingFetches = new Map<string, Promise<string>>()

const fetchAvatar = (url: string): Promise<string> => {
  if (avatarCache.has(url)) return Promise.resolve(avatarCache.get(url)!)
  if (pendingFetches.has(url)) return pendingFetches.get(url)!

  const promise = fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(String(response.status))

      return response.blob()
    })
    .then(blob => {
      const objectUrl = URL.createObjectURL(blob)
      avatarCache.set(url, objectUrl)
      pendingFetches.delete(url)

      return objectUrl
    })
    .catch(error => {
      pendingFetches.delete(url)
      throw error
    })

  pendingFetches.set(url, promise)

  return promise
}

const useAvatarObjectUrl = (picture?: string | null) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(
    () => avatarCache.get(picture ?? '') ?? null
  )
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!picture || failed) return
    if (avatarCache.has(picture)) {
      setObjectUrl(avatarCache.get(picture)!)

      return
    }

    let cancelled = false

    fetchAvatar(picture)
      .then(url => {
        if (!cancelled) setObjectUrl(url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [picture, failed])

  return { objectUrl, failed }
}

type TProps = {
  name?: string | null
  picture?: string | null
  size?: 'sm' | 'md'
}

export const UserAvatar = ({ name, picture, size = 'sm' }: TProps) => {
  const { objectUrl, failed } = useAvatarObjectUrl(picture)
  const sizeClass = size === 'sm' ? 'size-8' : 'size-10'
  const textClass = size === 'sm' ? 'text-sm' : 'text-base'
  const initial = (name ?? '?').charAt(0).toUpperCase()

  if (objectUrl && !failed) {
    return (
      <img
        src={objectUrl}
        alt=""
        className={StyleHelper.merge(
          sizeClass,
          'rounded-full object-cover shrink-0 select-none pointer-events-none'
        )}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={StyleHelper.merge(
        sizeClass,
        textClass,
        'rounded-full bg-linear-to-br from-primary to-primary/70 text-white font-semibold flex items-center justify-center shrink-0 select-none pointer-events-none'
      )}
    >
      {initial}
    </span>
  )
}
