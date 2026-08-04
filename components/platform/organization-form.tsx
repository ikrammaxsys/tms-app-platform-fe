"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PlatformActionFn } from "@/lib/platform/action-state"
import { usePlatformAction } from "@/hooks/use-platform-action"

export function OrganizationForm({
  action,
  organization,
}: {
  action: PlatformActionFn
  organization?: { id: number; name: string; code: string }
}) {
  const { formAction, pending } = usePlatformAction(action)

  return (
    <form action={formAction} className="max-w-xl">
      {organization ? <input type="hidden" name="id" value={organization.id} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              required
              defaultValue={organization?.code}
              placeholder="e.g. ACME"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={organization?.name}
              placeholder="e.g. Acme Corp"
            />
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          render={<Link href="/organizations">Cancel</Link>}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : organization ? "Save changes" : "Create organization"}
        </Button>
      </div>
    </form>
  )
}
