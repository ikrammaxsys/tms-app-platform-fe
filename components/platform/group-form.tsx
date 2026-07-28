"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function GroupForm({
  action,
  group,
}: {
  action: (formData: FormData) => void | Promise<void>
  group?: { id: number; name: string }
}) {
  return (
    <form action={action} className="max-w-xl">
      {group ? <input type="hidden" name="id" value={group.id} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={group?.name}
              placeholder="e.g. ACL Stack"
            />
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          render={<Link href="/application-groups">Cancel</Link>}
        />
        <Button type="submit">{group ? "Save changes" : "Create group"}</Button>
      </div>
    </form>
  )
}
