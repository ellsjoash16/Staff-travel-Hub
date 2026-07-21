import { cn } from '@/lib/utils'
import { ButtonGroup } from './button-group'
import { LiquidGlass } from './liquid-glass'
import { type FrostGlassVariantProp, glassVariantStyles } from './glass-variants'

type GlassButtonGroupProps = React.ComponentProps<typeof ButtonGroup> & FrostGlassVariantProp

export function GlassButtonGroup({
  className,
  glassVariant = 'liquid-refract',
  children,
  ...props
}: GlassButtonGroupProps) {
  if (glassVariant === 'liquid-refract') {
    return (
      <LiquidGlass className={cn('', className)}>
        <ButtonGroup
          data-slot="glass-button-group"
          data-glass-variant={glassVariant}
          className="bg-transparent w-full"
          {...props}
        >
          {children}
        </ButtonGroup>
      </LiquidGlass>
    )
  }

  return (
    <ButtonGroup
      data-slot="glass-button-group"
      data-glass-variant={glassVariant}
      className={cn('rounded-lg', glassVariantStyles[glassVariant], className)}
      {...props}
    >
      {children}
    </ButtonGroup>
  )
}
