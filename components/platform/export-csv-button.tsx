"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadCsv, type CsvColumn } from "@/lib/platform/export-csv"

export function ExportCsvButton<T>({
  filename,
  columns,
  rows,
  disabled = false,
}: {
  filename: string
  columns: CsvColumn<T>[]
  rows: T[]
  disabled?: boolean
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || rows.length === 0}
      onClick={() => downloadCsv(filename, columns, rows)}
    >
      <Download />
      Export CSV
    </Button>
  )
}
