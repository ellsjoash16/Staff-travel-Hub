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

// Caption with a single pop-out panel holding both a month column and a year
// column — scroll and tap either to jump, adjust both before closing.
function ScrollerCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, previousMonth, nextMonth } = useNavigation()
  const dp = useDayPicker()
  const [open, setOpen] = React.useState(false)
  const monthCol = React.useRef<HTMLDivElement>(null)
  const yearCol = React.useRef<HTMLDivElement>(null)

  const fromYear = dp.fromDate?.getFullYear() ?? 2005
  const toYear = dp.toDate?.getFullYear() ?? new Date().getFullYear() + 5
  const years: number[] = []
  for (let y = toYear; y >= fromYear; y--) years.push(y)

  const curMonth = displayMonth.getMonth()
  const curYear = displayMonth.getFullYear()

  // Centre the current month + year when the panel opens.
  React.useEffect(() => {
    if (!open) return
    const c = (el: HTMLDivElement | null) =>
      el?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
    c(monthCol.current)
    c(yearCol.current)
  }, [open])

  const jump = (m: number, y: number) => goToMonth(new Date(y, m, 1))

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
          <div className="absolute top-full left-0 z-20 mt-1 flex gap-1 rounded-xl border border-border bg-card p-1 shadow-xl">
            <div ref={monthCol} className="h-48 w-32 overflow-y-auto scroll-smooth">
              {MONTHS.map((m, i) => {
                const sel = i === curMonth
                return (
                  <button
                    key={m}
                    type="button"
                    data-selected={sel}
                    onClick={() => jump(i, curYear)}
                    className={cn(
                      'w-full text-left text-sm rounded-md px-2.5 py-1.5 transition-colors',
                      sel ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
            <div ref={yearCol} className="h-48 w-20 overflow-y-auto scroll-smooth">
              {years.map(y => {
                const sel = y === curYear
                return (
                  <button
                    key={y}
                    type="button"
                    data-selected={sel}
                    onClick={() => jump(curMonth, y)}
                    className={cn(
                      'w-full text-center text-sm rounded-md px-2 py-1.5 transition-colors',
                      sel ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
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
