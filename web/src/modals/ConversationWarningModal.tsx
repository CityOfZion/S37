import { useTranslation } from 'react-i18next'

import { Button } from '../components/Button'
import { Modal } from '../components/Modal'

type TProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const ConversationWarningModal = ({ open, onOpenChange, onConfirm }: TProps) => {
  const { t } = useTranslation('modals', { keyPrefix: 'conversationWarning' })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('title')} description={t('message')}>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t('cancel')}
        </Button>
        <Button onClick={onConfirm}>{t('confirm')}</Button>
      </div>
    </Modal>
  )
}
