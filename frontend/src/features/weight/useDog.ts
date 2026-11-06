import { useQuery } from '@tanstack/react-query'
import { client } from '../../api/client'

async function fetchDog(dogId: string, signal: AbortSignal) {
  const { data, response } = await client.GET('/api/dogs/{id}', {
    params: { path: { id: dogId } },
    signal,
  })

  // An unknown dog and the dog of another user are the same 404. It is an
  // expected answer, not an error: it must not be retried.
  if (response.status === 404) {
    return null
  }

  if (!data) {
    throw new Error('Could not load the dog')
  }

  return data
}

export function dogQueryKey(dogId: string) {
  return ['dogs', dogId] as const
}

export function useDog(dogId: string) {
  return useQuery({
    queryKey: dogQueryKey(dogId),
    queryFn: ({ signal }) => fetchDog(dogId, signal),
  })
}
