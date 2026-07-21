import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonGroupVariants = cva(
  'flex items-stretch *:focus-visible:relative *:focus-visible:z-10',
  {
    variants: {
      orientation: {
        horizontal:
          '*:data-[slot=button]:rounded-r-none' +
          ' [&>[data-slot=button]:not(:has(~[data-slot=button]))]:rounded-r-lg!' +
          ' [&>[data-slot=button]~[data-slot=button]]:rounded-l-none' +
          ' [&>[data-slot=button]~[data-slot=button]]:border-l-0',
        vertical:
          'flex-col *:data-[slot=button]:rounded-b-none' +
          ' [&>[data-slot=button]:not(:has(~[data-slot=button]))]:rounded-b-lg!' +
          ' [&>[data-slot=button]~[data-slot=button]]:rounded-t-none' +
          ' [&>[data-slot=button]~[data-slot=button]]:border-t-0',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
)

export function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation ?? 'horizontal'}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}
