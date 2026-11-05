import type { components } from '../../api/schema'

export type Dog = components['schemas']['Dog.jsonld-dog.read_timestampable.read_blameable.read']

export type WeightEntry =
  components['schemas']['WeightEntry.jsonld-weight_entry.read_timestampable.read_blameable.read']

/** What the API always sends in a weigh-in, though the schema marks it optional. */
export type WeighIn = Required<Pick<WeightEntry, 'id' | 'measured_at' | 'weight_grams'>>
