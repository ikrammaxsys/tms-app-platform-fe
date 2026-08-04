"use client"

import * as React from "react"

import {
  annotateJsonDriftLinesFromTemplate,
  type AgentConfig,
} from "@/lib/platform/agent-config-mock"
import { cn } from "@/lib/utils"

export function ConfigJsonPreview({
  json,
  highlightDrift = false,
  template,
  maxHeightClassName = "max-h-[720px]",
}: {
  json: string
  highlightDrift?: boolean
  template?: AgentConfig
  maxHeightClassName?: string
}) {
  const annotatedLines = React.useMemo(() => {
    if (!highlightDrift || !template) {
      return json.split("\n").map((text, index) => ({
        text,
        drifted: false,
        lineNumber: index + 1,
      }))
    }

    return annotateJsonDriftLinesFromTemplate(json, template)
  }, [highlightDrift, json, template])

  const hasDriftedLines = annotatedLines.some((line) => line.drifted)

  return (
    <div className="space-y-2">
      {hasDriftedLines ? (
        <p className="text-muted-foreground text-xs">
          Amber lines differ from the generated template (defaults, endpoints, applications, and server data).
        </p>
      ) : null}
      <pre
        className={cn(
          "bg-muted overflow-auto rounded-lg border p-0",
          maxHeightClassName,
          "font-mono text-xs leading-relaxed",
        )}
      >
        <code>
          {annotatedLines.map((line) => (
            <div
              key={`${line.lineNumber}-${line.text}`}
              className={cn(
                "flex min-w-full",
                line.drifted
                  ? "bg-amber-500/15 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100"
                  : "",
              )}
            >
              <span
                className={cn(
                  "text-muted-foreground/70 w-10 shrink-0 select-none border-r px-2 py-0.5 text-right",
                  line.drifted
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : "border-border/60 bg-muted/60",
                )}
              >
                {line.lineNumber}
              </span>
              <span className="min-w-0 flex-1 px-3 py-0.5 break-all whitespace-pre-wrap">
                {line.text || " "}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}
