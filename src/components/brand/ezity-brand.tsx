import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type EZityLogoMarkProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_MAP = {
  xs: 'size-4',
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-12',
  xl: 'size-16',
}

/**
 * Centralized EZity brand logo mark.
 * Uses the official EZity logo graphic with responsive sizing.
 */
export function EZityLogoMark({
  size = 'md',
  className,
  ...props
}: EZityLogoMarkProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center select-none',
        SIZE_MAP[size],
        className,
      )}
      aria-label="EZity AI Office"
      {...props}
    >
      <img
        src="/ezity-logo.png"
        alt="EZity AI Office"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  )
}

export type EZityBrandHeaderProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
}

/**
 * Reusable brand block with mark, title, and company / subtitle.
 */
export function EZityBrandHeader({
  size = 'md',
  showTagline = true,
  className,
  ...props
}: EZityBrandHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      <EZityLogoMark size={size} />
      <div className="flex flex-col text-left leading-tight">
        <span
          className={cn(
            'font-bold tracking-tight',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-base',
            size === 'lg' && 'text-xl',
          )}
          style={{ color: 'var(--theme-text, #111)' }}
        >
          EZity AI Office
        </span>
        {showTagline && (
          <span
            className="text-[11px] font-medium"
            style={{ color: 'var(--theme-muted, #888)' }}
          >
            EZity Solutions
          </span>
        )}
      </div>
    </div>
  )
}
