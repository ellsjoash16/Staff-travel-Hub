import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown-buttons',
  fromYear = 2005,
  toYear = new Date().getFullYear() + 5,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fixedWeeks
      captionLayout={captionLayout}
      fromYear={fromYear}
      toYear={toYear}
      className={cn('p-3 w-[280px]', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'space-y-3',
        caption: 'flex justify-between items-center mb-1',
        // Month + year dropdowns — click the label to jump quickly. The visible
        // label sizes tightly to the current value; a transparent <select> is
        // overlaid on top to open the native picker (rdp's default overlay CSS
        // isn't loaded here, so we recreate it with Tailwind).
        caption_dropdowns: 'flex items-center gap-1',
        caption_label: 'inline-flex items-center gap-0.5 text-sm font-semibold text-foreground cursor-pointer rounded-md px-1 py-0.5 hover:bg-muted',
        dropdown: 'absolute inset-0 w-full h-full appearance-none opacity-0 cursor-pointer',
        dropdown_icon: 'h-3 w-3 text-muted-foreground',
        dropdown_month: 'relative inline-flex items-center',
        dropdown_year: 'relative inline-flex items-center',
        vhidden: 'sr-only',
        nav: 'flex items-center gap-1',
        nav_button: cn(
          'h-7 w-7 bg-transparent p-0 rounded-lg hover:bg-muted transition-colors inline-flex items-center justify-center text-muted-foreground hover:text-foreground'
        ),
        nav_button_previous: '',
        nav_button_next: '',
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
        IconLeft: () => <CaretLeft className="h-4 w-4" />,
        IconRight: () => <CaretRight className="h-4 w-4" />,
        IconDropdown: () => <CaretDown className="h-3 w-3 text-muted-foreground" />,
      }}
      {...props}
    />
  )
}
