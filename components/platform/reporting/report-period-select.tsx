"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DEFAULT_REPORT_PERIOD,
  REPORT_PERIOD_OPTIONS,
  type ReportPeriod,
} from "@/lib/platform/reporting"

export function ReportPeriodSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: ReportPeriod
  onChange: (period: ReportPeriod) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v) as ReportPeriod)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Period" />
      </SelectTrigger>
      <SelectContent>
        {REPORT_PERIOD_OPTIONS.map((days) => (
          <SelectItem key={days} value={String(days)}>
            Last {days} days
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { DEFAULT_REPORT_PERIOD }
