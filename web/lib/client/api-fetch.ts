'use client'

import { clientLogger } from '@/lib/client-logger'

type ApiFetchInit = RequestInit & {
  restaurantId?: string | null
}

function getEndpoint(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.pathname
  return input.url
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchInit = {}) {
  const startedAt = performance.now()
  const response = await fetch(input, init)
  const endpoint = getEndpoint(input)

  void clientLogger.apiResponse({
    restaurantId: init.restaurantId,
    endpoint,
    durationMs: performance.now() - startedAt,
    status: response.status,
    method: init.method ?? 'GET',
  })

  return response
}
