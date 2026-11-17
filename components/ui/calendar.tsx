"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const nav = cn(
    buttonVariants({ variant: "ghost", size: "icon-sm" }),
    "size-8 p-0 select-none aria-disabled:opacity-40"
  )

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 [--cell-size:2.5rem]", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "flex flex-col gap-4",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: nav,
        button_next: nav,
        month_caption: "flex h-9 items-center justify-center px-9",
        dropdowns: "flex h-9 items-center justify-center gap-2 text-sm font-medium",
        dropdown_root:
          "relative rounded-md border border-input has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50",
        dropdown: "absolute inset-0 cursor-pointer opacity-0",
        caption_label:
          "flex h-9 items-center gap-1 rounded-md pr-2 pl-2 text-sm font-medium select-none [&>svg]:size-4 [&>svg]:text-muted-foreground",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex gap-1 w-full mb-2",
        weekday: "flex-1 text-center text-[0.8rem] font-semibold text-muted-foreground select-none h-9 flex items-center justify-center",
        week: "flex gap-1 w-full",
        day: "relative flex-1 text-center text-sm",
        day_button:
          "inline-flex w-full h-(--cell-size) items-center justify-center rounded-md text-sm transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:ring-2 [&>button]:ring-primary [&>button]:ring-offset-0",
        outside: "text-muted-foreground opacity-40",
        disabled: "text-muted-foreground opacity-35 cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className }) => {
          const Icon =
            orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown
          return <Icon className={cn("size-4", className)} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
