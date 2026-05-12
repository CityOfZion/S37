declare module '*.svg?react' {
  import type { ComponentProps, FunctionComponent } from 'react'

  export default FunctionComponent<ComponentProps<'svg'>>
}
