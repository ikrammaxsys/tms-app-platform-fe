"use client"

import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

export function CopyButton({ value }: { value: string }) {
  const handleClick = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      type="button"
      onClick={handleClick}
      className="rounded-md p-1"
      aria-label="Copy UID"
    >
      <Copy className="size-4" />
    </Button>
  )
}
