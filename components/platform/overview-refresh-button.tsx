"use client"

import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function OverviewRefreshButton({
  onRefresh,
  refreshing = false,
  disabled = false,
}: {
  onRefresh: () => void
  refreshing?: boolean
  disabled?: boolean
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={disabled || refreshing}
      aria-label="Refresh overview"
    >
      <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
      Refresh
    </Button>
  )
}
