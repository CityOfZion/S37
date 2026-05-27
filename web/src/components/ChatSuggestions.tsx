import { useEffect, useRef, useState } from 'react'

import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'

type TProps = {
  suggestions: string[]
  visible: boolean
  onSelect: (text: string) => void
}

export const ChatSuggestions = ({ suggestions, visible, onSelect }: TProps) => {
  const [mounted, setMounted] = useState(visible)
  const [animateOut, setAnimateOut] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible && mounted) {
      setAnimateOut(true)
      timeoutRef.current = setTimeout(() => {
        setMounted(false)
        setAnimateOut(false)
      }, 300)
    } else if (visible) {
      setMounted(true)
      setAnimateOut(false)
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [visible, mounted])

  if (!mounted) return null

  return (
    <div
      className={StyleHelper.merge(
        'flex gap-1.5 overflow-x-auto -mx-4 px-4 transition-all duration-300 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center sm:overflow-x-visible sm:pb-0 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden',
        animateOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      )}
    >
      {suggestions.map(suggestion => (
        <Button
          key={suggestion}
          type="button"
          variant="outline"
          size="xs"
          className="rounded-full text-neutral-600 hover:text-primary focus:text-primary active:opacity-80 whitespace-nowrap shadow-sm shrink-0"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}
