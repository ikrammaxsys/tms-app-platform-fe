"use client"

import * as React from "react"

function formatNow(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function NavbarClock() {
  const [now, setNow] = React.useState<Date | null>(null)

  React.useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <time
      dateTime={now?.toISOString()}
      className="text-muted-foreground tabular-nums text-sm"
      suppressHydrationWarning
    >
      {now ? formatNow(now) : "\u00a0"}
    </time>
  )
}
