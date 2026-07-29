"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { PlatformActionFn } from "@/lib/platform/action-state"
import { usePlatformAction } from "@/hooks/use-platform-action"

export function DeleteButton({
  id,
  label,
  action,
}: {
  id: number
  label: string
  action: PlatformActionFn
}) {
  const [open, setOpen] = React.useState(false)
  const onSettled = React.useCallback((ok: boolean) => {
    if (ok) setOpen(false)
  }, [])
  const { formAction, pending } = usePlatformAction(action, { onSettled })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            <Trash2 />
            Delete
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently remove{" "}
            <span className="text-foreground font-medium">{label}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={formAction}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
