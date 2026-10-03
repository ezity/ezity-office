'use client'

import { cn } from '@/lib/utils'
import { EZityLogoMark } from '@/components/brand/ezity-brand'

export type LogoLoaderProps = {
  className?: string
}

function LogoLoader({ className }: LogoLoaderProps) {
  return (
    <span className="logo-loader-track" aria-hidden="true">
      <EZityLogoMark
        size="xs"
        className={cn('logo-loader-icon size-4 rounded', className)}
      />
    </span>
  )
}

export { LogoLoader }
