"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ExportCsvButton } from "@/components/platform/export-csv-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { tmsApi } from "@/lib/platform/api-service"
import { deploymentCsvColumns } from "@/lib/platform/csv-exports"
import type { Application, ApplicationDeployment } from "@/lib/platform/types"

function nowTimestamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ")
}

type FormState = {
  id?: number
  applicationId: number
  commitNo: string
  version: string
  timestamp: string
}

export function DeploymentsPanel({
  applicationId,
  applicationName,
  defaultVersion,
  defaultCommit,
  applications,
}: {
  applicationId?: number
  applicationName?: string
  defaultVersion?: string
  defaultCommit?: string
  /** When provided, show application picker (global deployments page). */
  applications?: Application[]
}) {
  const lockedAppId = applicationId
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<ApplicationDeployment[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<ApplicationDeployment | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<FormState>({
    applicationId: lockedAppId ?? applications?.[0]?.id ?? 0,
    commitNo: defaultCommit ?? "",
    version: defaultVersion ?? "",
    timestamp: nowTimestamp(),
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await tmsApi.listDeployments(lockedAppId)
      setRows(items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deployments")
    } finally {
      setLoading(false)
    }
  }, [lockedAppId])

  React.useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setForm({
      applicationId: lockedAppId ?? applications?.[0]?.id ?? 0,
      commitNo: defaultCommit ?? "",
      version: defaultVersion ?? "",
      timestamp: nowTimestamp(),
    })
    setDialogOpen(true)
  }

  function openEdit(row: ApplicationDeployment) {
    setForm({
      id: row.id,
      applicationId: row.applicationId,
      commitNo: row.commitNo,
      version: row.version,
      timestamp: row.timestamp || nowTimestamp(),
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.applicationId || !form.version.trim()) {
      toast.error("Application and version are required")
      return
    }
    setSaving(true)
    try {
      const body = {
        applicationId: form.applicationId,
        commitNo: form.commitNo.trim(),
        version: form.version.trim(),
        timestamp: form.timestamp.trim() || nowTimestamp(),
      }
      if (form.id) {
        await tmsApi.updateDeployment(form.id, body)
        toast.success("Deployment updated")
      } else {
        await tmsApi.createDeployment(body)
        toast.success("Deployment created — application version updated")
      }
      setDialogOpen(false)
      await load()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await tmsApi.deleteDeployment(deleteTarget.id)
      toast.success("Deployment deleted")
      setDeleteTarget(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setSaving(false)
    }
  }

  const appItems = Object.fromEntries(
    (applications ?? []).map((a) => [String(a.id), a.name]),
  )

  return (
    <>
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Deployments</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {applicationName
                ? `Deployment history for ${applicationName}.`
                : "Track application deployment versions and commits."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportCsvButton
              filename={applicationName ? `${applicationName}-deployments` : "deployments"}
              columns={deploymentCsvColumns}
              rows={rows}
              disabled={loading}
            />
            <Button size="sm" onClick={openCreate}>
              <Plus />
              Add Deployment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!lockedAppId ? <TableHead>Application</TableHead> : null}
                    <TableHead>Version</TableHead>
                    <TableHead>Commit</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={lockedAppId ? 4 : 5}
                        className="text-muted-foreground h-20 text-center"
                      >
                        No deployments recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        {!lockedAppId ? (
                          <TableCell className="font-medium">
                            {row.applicationName || `App #${row.applicationId}`}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <span className="text-primary font-mono text-sm font-semibold">
                            {row.version}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.commitNo || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {row.timestamp || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit deployment"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Delete deployment"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit Deployment" : "Add Deployment"}
            </DialogTitle>
            <DialogDescription>
              Record a deployment version and commit for an application.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {!lockedAppId && applications ? (
              <div className="grid gap-1.5">
                <Label>Application</Label>
                <Select
                  items={appItems}
                  value={String(form.applicationId || "")}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, applicationId: Number(v) }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select application" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <input type="hidden" value={form.applicationId} readOnly />
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="dep-version">Version</Label>
              <Input
                id="dep-version"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                placeholder="e.g. v4.0.3"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-commit">Commit</Label>
              <Input
                id="dep-commit"
                value={form.commitNo}
                onChange={(e) => setForm((f) => ({ ...f, commitNo: e.target.value }))}
                placeholder="e.g. tms0004"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-ts">Timestamp</Label>
              <Input
                id="dep-ts"
                value={form.timestamp}
                onChange={(e) => setForm((f) => ({ ...f, timestamp: e.target.value }))}
                placeholder="yyyy-MM-dd HH:mm:ss"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete deployment?</DialogTitle>
            <DialogDescription>
              This will permanently remove deployment{" "}
              <span className="text-foreground font-medium">
                {deleteTarget?.version}
              </span>
              {deleteTarget?.commitNo ? ` (${deleteTarget.commitNo})` : ""}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={saving}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
