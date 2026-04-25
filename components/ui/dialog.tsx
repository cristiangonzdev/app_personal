'use client'

import * as React from 'react'
import * as RD from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = RD.Root
export const DialogTrigger = RD.Trigger
export const DialogClose = RD.Close

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof RD.Content>) {
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RD.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md max-h-[88vh] overflow-y-auto rounded-lg border border-border bg-bg-surface p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      >
        {children}
        <RD.Close className="absolute right-3 top-3 text-slate-500 hover:text-slate-200 transition-colors">
          <X size={16} />
        </RD.Close>
      </RD.Content>
    </RD.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props} />
}

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentProps<typeof RD.Title>>(
  ({ className, ...props }, ref) => (
    <RD.Title ref={ref} className={cn('text-lg font-semibold text-slate-100', className)} {...props} />
  ),
)
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentProps<typeof RD.Description>>(
  ({ className, ...props }, ref) => (
    <RD.Description ref={ref} className={cn('text-[12px] text-slate-500 mt-1', className)} {...props} />
  ),
)
DialogDescription.displayName = 'DialogDescription'

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 mt-5', className)} {...props} />
}
