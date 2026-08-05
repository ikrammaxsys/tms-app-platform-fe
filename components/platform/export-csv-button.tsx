"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  downloadCsv,
  downloadSpreadsheet,
  hasStyledColumns,
  type CsvColumn,
} from "@/lib/platform/export-csv"

export function ExportCsvButton<T>({
  filename,
  columns,
  rows,
  disabled = false,
  label,
}: {
  filename: string
  columns: CsvColumn<T>[]
  rows: T[]
  disabled?: boolean
  label?: string
}) {
  const styled = hasStyledColumns(columns)

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || rows.length === 0}
      onClick={() =>
        styled
          ? downloadSpreadsheet(filename, columns, rows)
          : downloadCsv(filename, columns, rows)
      }
    >
      <Download />
      {label ?? (styled ? "Export Excel" : "Export CSV")}
    </Button>
  )
}
