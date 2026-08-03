"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, FileText, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import type { ApplicationLogDate, ApplicationLogEntry } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 500

const LABEL_STYLES: Record<string, string> = {
  information: "text-sky-400",
  warning: "text-amber-400",
  error: "text-red-400",
  debug: "text-muted-foreground",
}

function formatLogDateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function chunkQueryValue(date: string, chunk: ApplicationLogDate["chunks"][number]): string {
  if (chunk.remoteName) {
    return `${date}/${chunk.remoteName}`
  }
  if (chunk.name) {
    return `${date}/${chunk.name}`
  }
  return chunk.path.replace(/^\//, "")
}

async function fetchAllLogEntries(
  applicationId: number,
  date: string,
  startChunk: string,
): Promise<ApplicationLogEntry[]> {
  let chunkParam: string | null = startChunk
  const entries: ApplicationLogEntry[] = []

  while (chunkParam) {
    const response = await tmsApi.getApplicationLogChunk(applicationId, date, chunkParam)
    entries.push(...response.logJson)

    if (!response.hasNext || !response.nextChunk) {
      break
    }

    chunkParam = response.nextChunk
  }

  return entries
}

export function ApplicationLogsPanel({
  applicationId,
  applicationName,
}: {
  applicationId: number
  applicationName: string
}) {
  const viewerRef = React.useRef<HTMLDivElement>(null)

  const [logDays, setLogDays] = React.useState<ApplicationLogDate[]>([])
  const [listLoading, setListLoading] = React.useState(true)
  const [listError, setListError] = React.useState<string | null>(null)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [entries, setEntries] = React.useState<ApplicationLogEntry[]>([])
  const [pageIndex, setPageIndex] = React.useState(0)
  const [logsLoading, setLogsLoading] = React.useState(false)
  const [logsError, setLogsError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    let cancelled = false

    async function loadList() {
      setListLoading(true)
      setListError(null)
      try {
        const data = await tmsApi.listApplicationLogs(applicationId)
        if (cancelled) return
        setLogDays(data.dates)
        setSelectedDate(data.dates[0]?.date ?? null)
      } catch (err) {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : "Failed to load log dates")
        }
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }

    void loadList()
    return () => {
      cancelled = true
    }
  }, [applicationId])

  React.useEffect(() => {
    if (!selectedDate) {
      setEntries([])
      setPageIndex(0)
      return
    }

    const day = logDays.find((item) => item.date === selectedDate)
    if (!day || day.chunks.length === 0) {
      setEntries([])
      setPageIndex(0)
      return
    }

    let cancelled = false
    const date = selectedDate
    const firstChunk = chunkQueryValue(date, day.chunks[0])

    async function loadLogs() {
      setLogsLoading(true)
      setLogsError(null)
      setEntries([])
      setPageIndex(0)
      viewerRef.current?.scrollTo({ top: 0 })

      try {
        const result = await fetchAllLogEntries(applicationId, date, firstChunk)
        if (cancelled) return
        setEntries(result)
        setPageIndex(0)
      } catch (err) {
        if (!cancelled) {
          setLogsError(err instanceof Error ? err.message : "Failed to load logs")
        }
      } finally {
        if (!cancelled) setLogsLoading(false)
      }
    }

    void loadLogs()
    return () => {
      cancelled = true
    }
  }, [applicationId, selectedDate, logDays])

  const filteredEntries = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return entries
    return entries.filter(
      (entry) =>
        entry.content.toLowerCase().includes(query) ||
        entry.label.toLowerCase().includes(query) ||
        entry.date.toLowerCase().includes(query),
    )
  }, [entries, search])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)

  React.useEffect(() => {
    setPageIndex(0)
    viewerRef.current?.scrollTo({ top: 0 })
  }, [search])

  React.useEffect(() => {
    if (pageIndex > totalPages - 1) {
      setPageIndex(Math.max(0, totalPages - 1))
    }
  }, [pageIndex, totalPages])

  const pageEntries = React.useMemo(() => {
    const start = safePageIndex * PAGE_SIZE
    return filteredEntries.slice(start, start + PAGE_SIZE)
  }, [filteredEntries, safePageIndex])

  const hasPrev = safePageIndex > 0
  const hasNext = safePageIndex < totalPages - 1
  const rangeStart =
    filteredEntries.length === 0 ? 0 : safePageIndex * PAGE_SIZE + 1
  const rangeEnd = Math.min((safePageIndex + 1) * PAGE_SIZE, filteredEntries.length)

  const goToPrevPage = React.useCallback(() => {
    if (!hasPrev || logsLoading) return
    setPageIndex((index) => Math.max(0, index - 1))
    viewerRef.current?.scrollTo({ top: 0 })
  }, [hasPrev, logsLoading])

  const goToNextPage = React.useCallback(() => {
    if (!hasNext || logsLoading) return
    setPageIndex((index) => Math.min(totalPages - 1, index + 1))
    viewerRef.current?.scrollTo({ top: 0 })
  }, [hasNext, logsLoading, totalPages])

  const selectedDay = logDays.find((day) => day.date === selectedDate)

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="flex min-h-[520px] p-0">
        <aside className="bg-muted/30 flex w-56 shrink-0 flex-col border-r">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Log dates</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Select a day to view entries
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {listLoading ? (
              <div className="space-y-2 px-1">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : listError ? (
              <p className="text-destructive px-2 py-4 text-sm">{listError}</p>
            ) : logDays.length === 0 ? (
              <p className="text-muted-foreground px-2 py-4 text-sm">No log dates found.</p>
            ) : (
              <ul className="space-y-0.5">
                {logDays.map((day) => {
                  const isActive = day.date === selectedDate
                  return (
                    <li key={day.applicationLogId}>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(day.date)}
                        className={cn(
                          "hover:bg-muted flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors",
                          isActive && "bg-primary/10 text-primary",
                        )}
                      >
                        <span className="text-sm font-medium">
                          {formatLogDateLabel(day.date)}
                        </span>
                        <span className="text-muted-foreground mt-0.5 text-xs">
                          {day.chunks.length} file{day.chunks.length === 1 ? "" : "s"}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{applicationName}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {selectedDay ? formatLogDateLabel(selectedDay.date) : "—"} ·{" "}
                {logsLoading
                  ? "Loading…"
                  : `${filteredEntries.length.toLocaleString()} lines`}
                {!logsLoading && filteredEntries.length > 0
                  ? ` · Page ${safePageIndex + 1} of ${totalPages}`
                  : ""}
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter logs…"
                className="h-8 pl-8 text-sm"
                disabled={logsLoading}
              />
            </div>
          </div>

          <div
            ref={viewerRef}
            className="bg-zinc-950 flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-zinc-100"
          >
            {logsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 12 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full bg-zinc-800" />
                ))}
              </div>
            ) : logsError ? (
              <div className="text-destructive flex h-full flex-col items-center justify-center gap-2 py-16">
                <p>{logsError}</p>
              </div>
            ) : pageEntries.length === 0 ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 py-16">
                <FileText className="size-8 opacity-40" />
                <p>
                  {entries.length === 0
                    ? "No log entries for this date."
                    : "No log entries match your filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {pageEntries.map((entry, index) => (
                  <div key={`${entry.date}-${safePageIndex}-${index}`} className="flex gap-3">
                    <span className="text-zinc-500 shrink-0">{entry.date}</span>
                    <span
                      className={cn(
                        "w-24 shrink-0 font-semibold",
                        LABEL_STYLES[entry.label.toLowerCase()] ?? "text-zinc-300",
                      )}
                    >
                      {entry.label}
                    </span>
                    <span className="min-w-0 break-all">{entry.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
            <p className="text-muted-foreground text-xs">
              {logsLoading
                ? "Loading logs…"
                : filteredEntries.length === 0
                  ? "No pages"
                  : `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${filteredEntries.length.toLocaleString()} · Page ${safePageIndex + 1} of ${totalPages}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={!hasPrev || logsLoading}
              >
                <ChevronLeft />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={!hasNext || logsLoading}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
