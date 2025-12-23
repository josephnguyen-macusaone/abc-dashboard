"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ErrorFallbackPage, AccessDeniedPage, NotFoundPage } from "@/presentation/components/pages/errors"
import { getErrorStatus } from "@/shared/helpers"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; statusCode?: number; status?: number }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    toast.error("Something went wrong", {
      description: error?.message,
    })
  }, [error])

  const status = getErrorStatus(error)

  if (status === 401 || status === 403) {
    return (
      <AccessDeniedPage
        title="Access denied"
        message="You don't have permission to view this page."
      />
    )
  }

  if (status === 404) {
    return (
      <NotFoundPage
        title="Page not found"
        message="Sorry, we couldn't find the page you're looking for."
      />
    )
  }

  return (
    <ErrorFallbackPage
      onRetry={reset}
      onHome={() => router.push("/")}
      message={error?.message}
    />
  )
}
