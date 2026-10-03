import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type EzityLogoMarkProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_MAP = {
  xs: 'size-4 text-[9px] rounded',
  sm: 'size-6 text-xs rounded-lg',
  md: 'size-8 text-sm rounded-xl',
  lg: 'size-12 text-lg rounded-2xl',
  xl: 'size-16 text-2xl rounded-2xl',
}

/**
 * Centralized Ezity brand logo mark.
 * Defaults to the themed 'EA' fallback badge using design system tokens.
 * Replace or enhance this component when final graphic assets are supplied.
 */
export function EzityLogoMark({
  size = 'md',
  className,
  ...props
}: EzityLogoMarkProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-bold tracking-tight select-none',
        'bg-[var(--theme-accent)] text-white shadow-sm',
        SIZE_MAP[size],
        className,
      )}
      style={{
        boxShadow:
          '0 2px 8px color-mix(in srgb, var(--theme-accent) 35%, transparent)',
      }}
      aria-label="Ezity AI Office"
      {...props}
    >
      EA
    </div>
  )
}

export type EzityBrandHeaderProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
}

/**
 * Reusable brand block with mark, title, and company / subtitle.
 */
export function EzityBrandHeader({
  size = 'md',
  showTagline = true,
  className,
  ...props
}: EzityBrandHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      <EzityLogoMark size={size} />
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
          Ezity AI Office
        </span>
        {showTagline && (
          <span
            className="text-[11px] font-medium"
            style={{ color: 'var(--theme-muted, #888)' }}
          >
            Ezity Solutions
          </span>
        )}
      </div>
    </div>
  )
}
