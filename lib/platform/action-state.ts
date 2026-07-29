import { ApiError } from "./api"

export type PlatformActionState = {
  ok: boolean
  message: string
  redirectTo?: string
}

export type PlatformActionFn = (
  prevState: PlatformActionState | null,
  formData: FormData,
) => Promise<PlatformActionState>

export function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return "Something went wrong"
}
