/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PUBLIC_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg?react' {
  import type { ComponentProps, FunctionComponent } from 'react'

  const ReactComponent: FunctionComponent<ComponentProps<'svg'>>

  export default ReactComponent
}
