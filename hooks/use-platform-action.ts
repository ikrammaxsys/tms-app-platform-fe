"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useActionState } from "react"
import { toast } from "sonner"

import type { PlatformActionFn } from "@/lib/platform/action-state"

export function usePlatformAction(
  action: PlatformActionFn,
  options?: { onSettled?: (ok: boolean) => void },
) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, null)

  const onSettled = options?.onSettled

  React.useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(state.message)
      onSettled?.(true)
      if (state.redirectTo) {
        router.push(state.redirectTo)
        router.refresh()
      }
    } else {
      toast.error(state.message)
      onSettled?.(false)
    }
  }, [state, router, onSettled])

  return { formAction, pending, state }
}
