import * as React from 'react'
import { DayPicker, useNavigation, useDayPicker, type CaptionProps } from 'react-day-picker'
import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const navBtn =
  'h-7 w-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none'

// Wheel geometry: an odd number of visible rows so one sits dead centre.
const ITEM_H = 34
const VISIBLE = 5
const PAD = (VISIBLE - 1) / 2 // blank rows above/below so ends reach the centre

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

// An iOS-style wheel: snap-to-centre scroller where the middle row is the
// selection. Off-centre rows fade and shrink for depth.
function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  align = 'center',
  width,
}: {
  items: string[]
  selectedIndex: number
  onSelect: (i: number) => void
  align?: 'center' | 'left'
  width: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const settle = React.useRef<ReturnType<typeof setTimeout>>()
  const [active, setActive] = React.useState(selectedIndex)

  // Centre the current value on open and whenever it changes externally.
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = selectedIndex * ITEM_H
    setActive(selectedIndex)
  }, [selectedIndex])

  function handleScroll() {
    const el = ref.current
    if (!el) return
    const i = clamp(Math.round(el.scrollTop / ITEM_H), 0, items.length - 1)
    setActive(i)
    clearTimeout(settle.current)
    // After momentum settles, commit the centred row.
    settle.current = setTimeout(() => {
      const idx = clamp(Math.round(el.scrollTop / ITEM_H), 0, items.length - 1)
      if (idx !== selectedIndex) onSelect(idx)
    }, 110)
  }

  function pick(i: number) {
    ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
    if (i !== selectedIndex) onSelect(i)
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className={cn('relative overflow-y-auto scrollbar-hide snap-y snap-mandatory', width)}
      style={{ height: VISIBLE * ITEM_H }}
    >
      <div style={{ height: PAD * ITEM_H }} />
      {items.map((label, i) => {
        const dist = Math.abs(i - active)
        const sel = i === active
        return (
          <button
            key={label}
            type="button"
            onClick={() => pick(i)}
            className={cn(
              'w-full snap-center flex items-center px-2 rounded-md transition-colors select-none',
              align === 'center' ? 'justify-center' : 'justify-start',
              sel ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
            style={{
              height: ITEM_H,
              opacity: dist === 0 ? 1 : Math.max(0.25, 1 - dist * 0.28),
              transform: `scale(${Math.max(0.82, 1 - dist * 0.07)})`,
            }}
          >
            {label}
          </button>
        )
      })}
      <div style={{ height: PAD * ITEM_H }} />
    </div>
  )
}

// Caption with a single pop-out panel holding both a month wheel and a year
// wheel — spin either to jump, adjust both before closing.
function ScrollerCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, previousMonth, nextMonth } = useNavigation()
  const dp = useDayPicker()
  const [open, setOpen] = React.useState(false)

  const fromYear = dp.fromDate?.getFullYear() ?? 2005
  const toYear = dp.toDate?.getFullYear() ?? new Date().getFullYear() + 5
  const years: number[] = []
  for (let y = fromYear; y <= toYear; y++) years.push(y)

  const curMonth = displayMonth.getMonth()
  const curYear = displayMonth.getFullYear()
  const yearIdx = clamp(curYear - fromYear, 0, years.length - 1)

  return (
    <div className="relative flex items-center justify-between mb-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-foreground rounded-md px-2 py-1 hover:bg-muted transition-colors"
      >
        {format(displayMonth, 'MMMM yyyy')}
        <CaretDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      <div className="flex items-center gap-1">
        <button type="button" className={navBtn} disabled={!previousMonth} onClick={() => previousMonth && goToMonth(previousMonth)} aria-label="Previous month">
          <CaretLeft className="h-4 w-4" />
        </button>
        <button type="button" className={navBtn} disabled={!nextMonth} onClick={() => nextMonth && goToMonth(nextMonth)} aria-label="Next month">
          <CaretRight className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-20 mt-1 flex gap-1 rounded-xl border border-border bg-card p-1.5 shadow-xl">
            {/* Centre selection band spanning both wheels. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-1.5 rounded-lg bg-primary/10 border-y border-primary/25"
              style={{ height: ITEM_H, top: `calc(50% - ${ITEM_H / 2}px)` }}
            />
            <WheelColumn
              items={MONTHS}
              selectedIndex={curMonth}
              onSelect={(i) => goToMonth(new Date(curYear, i, 1))}
              align="left"
              width="w-28"
            />
            <WheelColumn
              items={years.map(String)}
              selectedIndex={yearIdx}
              onSelect={(i) => goToMonth(new Date(years[i], curMonth, 1))}
              width="w-16"
            />
          </div>
        </>
      )}
    </div>
  )
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = 2005,
  toYear = new Date().getFullYear() + 5,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fixedWeeks
      fromYear={fromYear}
      toYear={toYear}
      className={cn('p-3 w-[280px]', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'space-y-3',
        table: 'w-full border-collapse',
        head_row: 'flex mb-1',
        head_cell: 'text-muted-foreground flex-1 font-medium text-[0.75rem] text-center uppercase tracking-wide',
        row: 'flex w-full gap-0',
        cell: cn(
          'flex-1 h-9 text-center p-0 relative',
          'focus-within:relative focus-within:z-20'
        ),
        day: cn(
          'h-9 w-full p-0 font-normal rounded-lg transition-colors text-sm',
          'hover:bg-muted inline-flex items-center justify-center',
          'aria-selected:opacity-100'
        ),
        day_range_end: 'day-range-end',
        day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg',
        day_today: 'text-primary font-semibold',
        day_outside: 'day-outside text-muted-foreground/30',
        day_disabled: 'text-muted-foreground opacity-30',
        day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Caption: ScrollerCaption,
      }}
      {...props}
    />
  )
}
