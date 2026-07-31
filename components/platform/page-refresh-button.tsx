"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"

export function PageRefreshButton() {
  const router = useRouter()
  const [refreshing, startTransition] = React.useTransition()

  return (
    <OverviewRefreshButton
      onRefresh={() => startTransition(() => router.refresh())}
      refreshing={refreshing}
    />
  )
}
