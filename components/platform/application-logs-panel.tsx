"use client"

import * as React from "react"
import { FileText, Search } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import type { ApplicationLogDate, ApplicationLogEntry } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

const CHUNK_BATCH_SIZE = 10
const SCROLL_THRESHOLD_PX = 48

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

async function fetchLogChunkBatch(
  applicationId: number,
  date: string,
  startChunk: string,
  maxChunks: number,
): Promise<{
  entries: ApplicationLogEntry[]
  nextChunk: string | null
  hasMore: boolean
}> {
  let chunkParam: string | null = startChunk
  const entries: ApplicationLogEntry[] = []
  let chunksLoaded = 0

  while (chunkParam && chunksLoaded < maxChunks) {
    const response = await tmsApi.getApplicationLogChunk(applicationId, date, chunkParam)
    entries.push(...response.logJson)
    chunksLoaded++

    if (!response.hasNext || !response.nextChunk) {
      return { entries, nextChunk: null, hasMore: false }
    }

    chunkParam = response.nextChunk
  }

  return {
    entries,
    nextChunk: chunkParam,
    hasMore: chunkParam !== null,
  }
}

export function ApplicationLogsPanel({
  applicationId,
  applicationName,
}: {
  applicationId: number
  applicationName: string
}) {
  const viewerRef = React.useRef<HTMLDivElement>(null)
  const loadingMoreRef = React.useRef(false)

  const [logDays, setLogDays] = React.useState<ApplicationLogDate[]>([])
  const [listLoading, setListLoading] = React.useState(true)
  const [listError, setListError] = React.useState<string | null>(null)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [entries, setEntries] = React.useState<ApplicationLogEntry[]>([])
  const [nextChunk, setNextChunk] = React.useState<string | null>(null)
  const [hasMore, setHasMore] = React.useState(false)
  const [logsLoading, setLogsLoading] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [logsError, setLogsError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    loadingMoreRef.current = loadingMore
  }, [loadingMore])

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

  const loadMoreChunks = React.useCallback(
    async (date: string, chunk: string) => {
      if (loadingMoreRef.current) return

      setLoadingMore(true)
      loadingMoreRef.current = true
      setLogsError(null)

      try {
        const result = await fetchLogChunkBatch(
          applicationId,
          date,
          chunk,
          CHUNK_BATCH_SIZE,
        )
        setEntries((current) => [...current, ...result.entries])
        setNextChunk(result.nextChunk)
        setHasMore(result.hasMore)
      } catch (err) {
        setLogsError(err instanceof Error ? err.message : "Failed to load more logs")
      } finally {
        setLoadingMore(false)
        loadingMoreRef.current = false
      }
    },
    [applicationId],
  )

  React.useEffect(() => {
    if (!selectedDate) {
      setEntries([])
      setNextChunk(null)
      setHasMore(false)
      return
    }

    const day = logDays.find((item) => item.date === selectedDate)
    if (!day || day.chunks.length === 0) {
      setEntries([])
      setNextChunk(null)
      setHasMore(false)
      return
    }

    let cancelled = false
    const date = selectedDate
    const firstChunk = chunkQueryValue(date, day.chunks[0])

    async function loadInitial() {
      setLogsLoading(true)
      setLogsError(null)
      setEntries([])
      setNextChunk(null)
      setHasMore(false)
      viewerRef.current?.scrollTo({ top: 0 })

      try {
        const result = await fetchLogChunkBatch(
          applicationId,
          date,
          firstChunk,
          CHUNK_BATCH_SIZE,
        )
        if (cancelled) return
        setEntries(result.entries)
        setNextChunk(result.nextChunk)
        setHasMore(result.hasMore)
      } catch (err) {
        if (!cancelled) {
          setLogsError(err instanceof Error ? err.message : "Failed to load logs")
        }
      } finally {
        if (!cancelled) setLogsLoading(false)
      }
    }

    void loadInitial()
    return () => {
      cancelled = true
    }
  }, [applicationId, selectedDate, logDays])

  const handleViewerScroll = React.useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer || logsLoading || loadingMoreRef.current || !hasMore || !nextChunk || !selectedDate) {
      return
    }

    const atBottom =
      viewer.scrollTop + viewer.clientHeight >= viewer.scrollHeight - SCROLL_THRESHOLD_PX

    if (atBottom) {
      void loadMoreChunks(selectedDate, nextChunk)
    }
  }, [hasMore, loadMoreChunks, logsLoading, nextChunk, selectedDate])

  React.useEffect(() => {
    const viewer = viewerRef.current
    if (
      !viewer ||
      logsLoading ||
      loadingMore ||
      !hasMore ||
      !nextChunk ||
      !selectedDate
    ) {
      return
    }

    const needsMore = viewer.scrollHeight <= viewer.clientHeight + SCROLL_THRESHOLD_PX
    if (needsMore) {
      void loadMoreChunks(selectedDate, nextChunk)
    }
  }, [entries, hasMore, loadMoreChunks, loadingMore, logsLoading, nextChunk, selectedDate])

  const selectedDay = logDays.find((day) => day.date === selectedDate)
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
                {!logsLoading && hasMore ? " · scroll for more" : ""}
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
            onScroll={handleViewerScroll}
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
            ) : filteredEntries.length === 0 ? (
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
                {filteredEntries.map((entry, index) => (
                  <div key={`${entry.date}-${index}`} className="flex gap-3">
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
                {loadingMore ? (
                  <p className="text-zinc-500 py-3 text-center">Loading more…</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
