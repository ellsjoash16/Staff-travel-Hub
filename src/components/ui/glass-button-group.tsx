import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { ButtonGroup } from './button-group'
import { LiquidGlass, type LiquidGlassProps } from './liquid-glass'
import { type FrostGlassVariantProp, glassVariantStyles } from './glass-variants'

type GlassButtonGroupProps = React.ComponentProps<typeof ButtonGroup> &
  FrostGlassVariantProp &
  Pick<LiquidGlassProps, 'blur' | 'refraction' | 'bezel' | 'saturation'> & {
    glassStyle?: CSSProperties
  }

export function GlassButtonGroup({
  className,
  glassVariant = 'liquid-refract',
  blur,
  refraction,
  bezel,
  saturation,
  glassStyle,
  children,
  ...props
}: GlassButtonGroupProps) {
  if (glassVariant === 'liquid-refract') {
    return (
      <LiquidGlass
        className={cn('', className)}
        blur={blur}
        refraction={refraction}
        bezel={bezel}
        saturation={saturation}
        style={glassStyle}
      >
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
