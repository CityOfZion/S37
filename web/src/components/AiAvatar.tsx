import ChatIcon from '../assets/icons/chat-icon.svg?react'

export const AiAvatar = () => (
  <div className="size-8 rounded-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 select-none pointer-events-none">
    <ChatIcon className="size-4 text-white" aria-hidden="true" />
  </div>
)
