import { type ComponentPropsWithoutRef } from 'react'

import { Link } from '@tanstack/react-router'

import { StyleHelper } from '../helpers/StyleHelper'

type TProps = ComponentPropsWithoutRef<typeof Link>

export const NavLink = ({ className, ...props }: TProps) => (
  <Link
    className={StyleHelper.merge(
      'active:opacity-70 transition-opacity',
      typeof className === 'string' ? className : undefined
    )}
    {...props}
  />
)
