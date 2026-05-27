import { type ChangeEvent, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { ALLOWED_INPUT_ACCEPT } from 'fractapay-shared'

import { StyleHelper } from '../helpers/StyleHelper'
import { Button } from './Button'
import { ChatSuggestions } from './ChatSuggestions'
import { Tooltip } from './Tooltip'

import AttachIcon from '../assets/icons/attach-icon.svg?react'
import CloseIcon from '../assets/icons/close-icon.svg?react'
import FileIcon from '../assets/icons/file-icon.svg?react'
import SendIcon from '../assets/icons/send-icon.svg?react'

type TProps = {
  draftMessage: string
  attachedFile: File | null
  disabled: boolean
  orderExecuted: boolean
  hasUserMessage: boolean
  fileInputRef: RefObject<HTMLInputElement>
  textareaRef: RefObject<HTMLTextAreaElement>
  suggestions: string[]
  onChangeDraft: (value: string) => void
  onRemoveFile: () => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: () => void
  onSelectSuggestion: (text: string) => void
}

export const ChatInput = ({
  draftMessage,
  attachedFile,
  disabled,
  orderExecuted,
  hasUserMessage,
  fileInputRef,
  textareaRef,
  suggestions,
  onChangeDraft,
  onRemoveFile,
  onFileChange,
  onKeyDown,
  onSubmit,
  onSelectSuggestion,
}: TProps) => {
  const { t } = useTranslation('pages', { keyPrefix: 'chat' })

  return (
    <div className="max-w-3xl mx-auto w-full px-4 space-y-2">
      <ChatSuggestions
        suggestions={suggestions}
        visible={!hasUserMessage && !orderExecuted}
        onSelect={onSelectSuggestion}
      />

      {attachedFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-500">
          <FileIcon className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span className="truncate select-none">{attachedFile.name}</span>
          <Tooltip content={t('removeFile')}>
            <Button
              variant="ghost"
              size="xs"
              className="ml-auto p-1 shrink-0"
              aria-label={t('removeFile')}
              onClick={onRemoveFile}
            >
              <CloseIcon className="size-4 text-neutral-700" aria-hidden="true" />
            </Button>
          </Tooltip>
        </div>
      )}

      <form
        onSubmit={event => {
          event.preventDefault()
          onSubmit()
        }}
        className={StyleHelper.merge(
          'flex items-end gap-2 bg-white border rounded-2xl px-3 py-3 shadow-sm transition-colors',
          disabled ? 'border-neutral-100 opacity-60' : 'border-neutral-200'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_INPUT_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label={t('attachFile')}
          onChange={onFileChange}
        />

        <Tooltip content={t('attachFile')}>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="p-2 shrink-0"
            aria-label={t('attachFile')}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <AttachIcon className="size-5" aria-hidden="true" />
          </Button>
        </Tooltip>

        <textarea
          name="message"
          ref={textareaRef}
          value={draftMessage}
          onChange={event => onChangeDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={orderExecuted ? t('orderExecuted') : t('placeholder')}
          aria-label={t('placeholder')}
          rows={1}
          maxLength={5000}
          disabled={disabled}
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
            disabled={disabled || (!draftMessage.trim() && !attachedFile)}
          >
            <SendIcon className="size-5 text-primary" aria-hidden="true" />
          </Button>
        </Tooltip>
      </form>

      <p className="text-xs text-neutral-400 text-center select-none">{t('hint')}</p>
    </div>
  )
}
