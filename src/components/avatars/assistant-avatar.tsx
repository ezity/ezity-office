import { memo } from 'react'
import { cn } from '@/lib/utils'

type AvatarProps = {
  size?: number
  className?: string
}

/**
 * Assistant avatar — EZity AI Office logo mark.
 */
function AssistantAvatarComponent({ size = 28, className }: AvatarProps) {
  return (
    <img
      src="/ezity-logo.png"
      alt="EZity Office"
      className={cn('shrink-0 object-contain', className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(4, Math.round(size * 0.15)),
      }}
    />
  )
}

export const AssistantAvatar = memo(AssistantAvatarComponent)
