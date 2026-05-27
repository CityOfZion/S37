import { AiAvatar } from './AiAvatar'

export const ChatThinking = () => (
  <div className="flex items-start gap-3">
    <AiAvatar />
    <div className="bg-white rounded-2xl rounded-bl-sm p-5 shadow-sm border border-neutral-100 flex items-center gap-1.5">
      <span className="size-1.5 rounded-full bg-primary/40 animate-[pulse_1s_ease-in-out_infinite] [animation-delay:0ms]" />
      <span className="size-1.5 rounded-full bg-primary/60 animate-[pulse_1s_ease-in-out_infinite] [animation-delay:200ms]" />
      <span className="size-1.5 rounded-full bg-primary/80 animate-[pulse_1s_ease-in-out_infinite] [animation-delay:400ms]" />
    </div>
  </div>
)
