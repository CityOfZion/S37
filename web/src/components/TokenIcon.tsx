import type { TToken } from 'fractapay-shared'

import { TOKEN_ICON_URL } from '../constants'
import { StyleHelper } from '../helpers/StyleHelper'

type TProps = {
  token: TToken
  className?: string
}

export const TokenIcon = ({ token, className }: TProps) => {
  const url = TOKEN_ICON_URL[token]

  if (!url) return null

  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      className={StyleHelper.merge('rounded-full shrink-0', className)}
    />
  )
}
