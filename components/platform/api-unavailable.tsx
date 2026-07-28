import { AlertTriangle } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export function ApiUnavailable({ error }: { error?: unknown }) {
  const message =
    error instanceof Error ? error.message : "Failed to reach the TMS API."

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="flex items-start gap-3 pt-6">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-semibold">API unavailable</p>
          <p className="text-muted-foreground">{message}</p>
          <p className="text-muted-foreground">
            Start <code className="bg-muted rounded px-1 py-0.5 text-xs">tms-template-net8</code>{" "}
            on{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">http://127.0.0.1:5128</code>
            , then restart Next.js. Browser calls go through{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">/backend-api</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
