import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border',
  {
    variants: {
      tone: {
        slate: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
        cyan: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30',
        green: 'bg-accent-green/10 text-accent-green border-accent-green/30',
        amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
        red: 'bg-accent-red/10 text-accent-red border-accent-red/30',
        violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/30',
      },
    },
    defaultVariants: { tone: 'slate' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
