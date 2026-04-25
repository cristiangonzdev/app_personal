import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan disabled:opacity-50 min-h-[80px]',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
