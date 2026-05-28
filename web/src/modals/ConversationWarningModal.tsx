import { useTranslation } from 'react-i18next'

import { Button } from '../components/Button'
import { Modal } from '../components/Modal'

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  variant?: 'new' | 'open' | 'logout'
}

export const ConversationWarningModal = ({
  open,
  onOpenChange,
  onConfirm,
  variant = 'new',
}: TProps) => {
  const { t } = useTranslation('modals', { keyPrefix: 'conversationWarning' })

  const title =
    variant === 'open' ? t('openTitle') : variant === 'logout' ? t('logoutTitle') : t('title')
  const message =
    variant === 'open' ? t('openMessage') : variant === 'logout' ? t('logoutMessage') : t('message')
  const confirm =
    variant === 'open' ? t('openConfirm') : variant === 'logout' ? t('logoutConfirm') : t('confirm')

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={message}>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t('cancel')}
        </Button>
        <Button onClick={onConfirm}>{confirm}</Button>
      </div>
    </Modal>
  )
}
