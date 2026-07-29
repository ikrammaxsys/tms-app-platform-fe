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
import {
  ENVIRONMENT_OPTIONS,
  INTERNAL_EXTERNAL_OPTIONS,
  PROVIDER_OPTIONS,
} from "@/lib/platform/options"
import type { Server } from "@/lib/platform/types"
import type { PlatformActionFn } from "@/lib/platform/action-state"
import { usePlatformAction } from "@/hooks/use-platform-action"

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

export function ServerForm({
  action,
  server,
}: {
  action: PlatformActionFn
  server?: Server
}) {
  const envItems = Object.fromEntries(ENVIRONMENT_OPTIONS.map((v) => [v, v]))
  const ieItems = Object.fromEntries(INTERNAL_EXTERNAL_OPTIONS.map((v) => [v, v]))
  const providerItems = Object.fromEntries(PROVIDER_OPTIONS.map((v) => [v, v]))
  const { formAction, pending } = usePlatformAction(action)

  return (
    <form action={formAction} className="max-w-3xl">
      {server ? <input type="hidden" name="id" value={server.id} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Server Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Domain" htmlFor="domain">
            <Input
              id="domain"
              name="domain"
              required
              defaultValue={server?.domain}
              placeholder="e.g. tms-eapp.webapp.toray"
            />
          </Field>
          <Field label="IP Address" htmlFor="ipAddress">
            <Input
              id="ipAddress"
              name="ipAddress"
              required
              defaultValue={server?.ipAddress}
              placeholder="e.g. 10.188.9.136"
            />
          </Field>
          <Field label="Environment">
            <Select
              name="environment"
              items={envItems}
              defaultValue={server?.environment ?? "Live"}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENT_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Internal / External">
            <Select
              name="internalExternal"
              items={ieItems}
              defaultValue={server?.internalExternal ?? "Internal"}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERNAL_EXTERNAL_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Country" htmlFor="country">
            <Input
              id="country"
              name="country"
              defaultValue={server?.country}
              placeholder="e.g. JP"
            />
          </Field>
          <Field label="Provider">
            <Select
              name="provider"
              items={providerItems}
              defaultValue={server?.provider ?? "AWS"}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" render={<Link href="/servers">Cancel</Link>} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : server ? "Save changes" : "Create server"}
        </Button>
      </div>
    </form>
  )
}
