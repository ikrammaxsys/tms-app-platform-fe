"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { APP_STATUS_OPTIONS } from "@/lib/platform/options"
import { toDateTimeLocal } from "@/lib/platform/format"
import type { ApplicationView, ApplicationGroup, Server } from "@/lib/platform/types"

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function ApplicationForm({
  action,
  application,
  servers,
  groups,
}: {
  action: (formData: FormData) => void | Promise<void>
  application?: ApplicationView
  servers: Server[]
  groups: ApplicationGroup[]
}) {
  const statusItems = Object.fromEntries(APP_STATUS_OPTIONS.map((s) => [s, s]))
  const serverItems = Object.fromEntries(servers.map((s) => [String(s.id), s.domain]))
  const groupItems = Object.fromEntries(groups.map((g) => [String(g.id), g.name]))

  return (
    <form action={action} className="max-w-3xl">
      {application ? <input type="hidden" name="id" value={application.id} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              name="name"
              required
              defaultValue={application?.name}
              placeholder="e.g. Core API"
            />
          </Field>
          <Field label="Version" htmlFor="version">
            <Input
              id="version"
              name="version"
              required
              defaultValue={application?.version}
              placeholder="e.g. v4.0.3"
            />
          </Field>
          <Field label="Commit ID" htmlFor="commit">
            <Input
              id="commit"
              name="commit"
              defaultValue={application?.commit}
              placeholder="e.g. tms0004"
            />
          </Field>
          <Field label="Status">
            <Select
              name="status"
              items={statusItems}
              defaultValue={application?.status ?? "Healthy"}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Application Group">
            <Select
              name="applicationGroupId"
              items={groupItems}
              defaultValue={String(application?.applicationGroupId ?? groups[0]?.id ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Server">
            <Select
              name="serverId"
              items={serverItems}
              defaultValue={String(application?.serverId ?? servers[0]?.id ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Last Deployment" htmlFor="lastDeployment">
            <Input
              id="lastDeployment"
              name="lastDeployment"
              type="datetime-local"
              defaultValue={toDateTimeLocal(application?.lastDeployment)}
            />
          </Field>
          <Field label="App URL" htmlFor="appUrl">
            <Input
              id="appUrl"
              name="appUrl"
              defaultValue={application?.appUrl}
              placeholder="https://..."
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Repository URL" htmlFor="repositoryUrl">
              <Input
                id="repositoryUrl"
                name="repositoryUrl"
                defaultValue={application?.repositoryUrl}
                placeholder="https://github.com/..."
              />
            </Field>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" render={<Link href="/applications">Cancel</Link>} />
        <Button type="submit">{application ? "Save changes" : "Create application"}</Button>
      </div>
    </form>
  )
}
