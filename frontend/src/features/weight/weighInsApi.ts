import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '../../api/client'
import type { WeighIn, WeightEntry } from './types'
import { compareWeighIns } from './weighIns'

export type WeighInValues = Pick<WeighIn, 'measured_at' | 'weight_grams'>

export type Violation = { propertyPath: string; message: string }

/** A 422 of the API. */
export class WeighInValidationError extends Error {
  readonly violations: Violation[]

  constructor(violations: Violation[]) {
    super('The API rejected the weigh-in')
    this.violations = violations
  }
}

export function weighInsQueryKey(dogId: string) {
  return ['dogs', dogId, 'weightEntries'] as const
}

function isWeighIn(entry: WeightEntry): entry is WeightEntry & WeighIn {
  return entry.id !== undefined && entry.measured_at !== undefined
}

/**
 * Only the page number is read from `view.next`: the requests stay on the API
 * and go through `client`, whatever URL the response contains.
 */
function nextPageNumber(next: string | null | undefined, currentPage: number): number | null {
  if (!next) {
    return null
  }

  const page = Number(new URL(next, window.location.origin).searchParams.get('page'))

  // A partial list would give wrong gaps and alerts: better no list at all.
  if (!Number.isInteger(page) || page <= currentPage) {
    throw new Error('Invalid next page in the weigh-ins collection')
  }

  return page
}

function fetchPage(dogIri: string, page: number, signal?: AbortSignal) {
  return client.GET('/api/weight_entries', { params: { query: { dog: dogIri, page } }, signal })
}

/**
 * Every weigh-in of a dog, in chronological order. The default order of the API
 * (date then id, descending) stays stable from one page to the next; there is
 * no `order[id]` to ask for the opposite.
 */
export async function fetchAllWeighIns(dogIri: string, signal?: AbortSignal): Promise<WeighIn[]> {
  const byId = new Map<string, WeighIn>()
  let page: number | null = 1

  while (page !== null) {
    const { data }: Awaited<ReturnType<typeof fetchPage>> = await fetchPage(dogIri, page, signal)

    if (!data) {
      throw new Error('Could not load the weigh-ins')
    }

    // A weigh-in added meanwhile shifts the pages: the same line can come twice.
    for (const entry of data.member.filter(isWeighIn)) {
      const { id, measured_at, weight_grams } = entry
      byId.set(id, { id, measured_at, weight_grams })
    }

    page = nextPageNumber(data.view?.next, page)
  }

  return [...byId.values()].sort(compareWeighIns)
}

function toError(response: Response, error: unknown): Error {
  if (response.status === 422 && error && typeof error === 'object' && 'violations' in error) {
    return new WeighInValidationError((error.violations as Violation[] | undefined) ?? [])
  }

  return new Error('The weigh-in request failed')
}

async function createWeighIn(dogIri: string, values: WeighInValues) {
  const { response, error } = await client.POST('/api/weight_entries', {
    body: { dog: dogIri, ...values },
    headers: { 'Content-Type': 'application/ld+json' },
  })

  if (!response.ok) {
    throw toError(response, error)
  }
}

async function updateWeighIn(id: string, values: WeighInValues) {
  const { response, error } = await client.PATCH('/api/weight_entries/{id}', {
    params: { path: { id } },
    body: values,
    headers: { 'Content-Type': 'application/merge-patch+json' },
  })

  if (!response.ok) {
    throw toError(response, error)
  }
}

async function deleteWeighIn(id: string) {
  const { response, error } = await client.DELETE('/api/weight_entries/{id}', {
    params: { path: { id } },
  })

  if (!response.ok) {
    throw toError(response, error)
  }
}

export function useWeighIns(dogId: string, dogIri: string) {
  return useQuery({
    queryKey: weighInsQueryKey(dogId),
    queryFn: ({ signal }) => fetchAllWeighIns(dogIri, signal),
  })
}

function useInvalidateWeighIns(dogId: string) {
  const queryClient = useQueryClient()

  return () => queryClient.invalidateQueries({ queryKey: weighInsQueryKey(dogId) })
}

export function useCreateWeighIn(dogId: string, dogIri: string) {
  const invalidate = useInvalidateWeighIns(dogId)

  return useMutation({
    mutationFn: (values: WeighInValues) => createWeighIn(dogIri, values),
    onSuccess: invalidate,
  })
}

export function useUpdateWeighIn(dogId: string) {
  const invalidate = useInvalidateWeighIns(dogId)

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: WeighInValues }) => updateWeighIn(id, values),
    onSuccess: invalidate,
  })
}

export function useDeleteWeighIn(dogId: string) {
  const invalidate = useInvalidateWeighIns(dogId)

  return useMutation({
    mutationFn: deleteWeighIn,
    onSuccess: invalidate,
  })
}
