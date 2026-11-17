"use client"

import * as React from "react"
import { FileSpreadsheet, LoaderCircle, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

export function FileDropzone({
  onFile,
  busy,
  error,
}: {
  onFile: (file: File) => void
  busy: boolean
  error: string | null
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  const open = () => {
    if (!busy) inputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose the challan Excel file"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            open()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file && !busy) onFile(file)
        }}
        className={cn(
          "flex cursor-pointer flex-col items-start gap-4 rounded-lg border-2 border-dashed bg-card p-8 transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-10",
          dragging ? "border-primary bg-accent" : "border-input hover:border-primary/50"
        )}
      >
        <span className="grid size-11 place-items-center rounded-md bg-secondary text-secondary-foreground">
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <FileSpreadsheet className="size-5" />}
        </span>
        <div>
          <p className="text-lg font-semibold">
            {busy ? "Reading your file…" : "Drop the challan Excel file here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {busy ? "This only takes a moment." : "or click to choose a file. Only .xlsx files are supported."}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ""
        }}
      />

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
