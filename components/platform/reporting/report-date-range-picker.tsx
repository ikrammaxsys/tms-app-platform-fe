"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MAX_APPLICATION_REPORT_MONTHS,
  type ApplicationReportRange,
  validateApplicationReportRange,
} from "@/lib/platform/reporting"

export function ReportDateRangePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ApplicationReportRange
  onChange: (range: ApplicationReportRange) => void
  disabled?: boolean
}) {
  const validationError = validateApplicationReportRange(value)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="report-start-date" className="text-xs">
            Start date
          </Label>
          <Input
            id="report-start-date"
            type="date"
            value={value.startDate}
            max={value.endDate || today}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, startDate: event.target.value })
            }
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-end-date" className="text-xs">
            End date
          </Label>
          <Input
            id="report-end-date"
            type="date"
            value={value.endDate}
            min={value.startDate}
            max={today}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, endDate: event.target.value })}
            className="w-[160px]"
          />
        </div>
      </div>
      {validationError ? (
        <p className="text-destructive text-xs">{validationError}</p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Maximum range: {MAX_APPLICATION_REPORT_MONTHS} months
        </p>
      )}
    </div>
  )
}
