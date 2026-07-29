"use client"

import * as React from "react"
import Link from "next/link"
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PlatformActionFn } from "@/lib/platform/action-state"
import { usePlatformAction } from "@/hooks/use-platform-action"

export function RowActions({
  id,
  label,
  viewHref,
  editHref,
  deleteAction,
}: {
  id: number
  label: string
  viewHref: string
  editHref: string
  deleteAction: PlatformActionFn
}) {
  const [open, setOpen] = React.useState(false)
  const onSettled = React.useCallback((ok: boolean) => {
    if (ok) setOpen(false)
  }, [])
  const { formAction, pending } = usePlatformAction(deleteAction, { onSettled })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Row actions">
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={viewHref} />}>
            <Eye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={editHref} />}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
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
    </>
  )
}
