import { describe, expect, it } from 'vitest'
import { computeWeightAlerts, formatWeightAlert } from './alerts'

const ADULT = '2022-03-14'
const PUPPY = '2026-06-01'

const weighIn = (id: string, measured_at: string, weight_grams: number) => ({
  id,
  measured_at,
  weight_grams,
})

const kinds = (list: ReturnType<typeof computeWeightAlerts>) => list.map(({ kind }) => kind)

describe('computeWeightAlerts', () => {
  it('gives nothing without weigh-ins, or with a single one', () => {
    expect(computeWeightAlerts([], ADULT)).toEqual([])
    expect(computeWeightAlerts([weighIn('a', '2026-10-01', 4000)], ADULT)).toEqual([])
  })

  describe('loss', () => {
    it('alerts at exactly 5 %', () => {
      const alerts = computeWeightAlerts(
        [weighIn('a', '2026-10-01', 4000), weighIn('b', '2026-10-12', 3800)],
        ADULT,
      )

      expect(alerts).toEqual([{ kind: 'loss', percent: -5, since: '2026-10-01' }])
    })

    it('does not alert just under 5 %', () => {
      expect(
        computeWeightAlerts(
          [weighIn('a', '2026-10-01', 4000), weighIn('b', '2026-10-12', 3801)],
          ADULT,
        ),
      ).toEqual([])
    })

    it('alerts for a puppy too', () => {
      expect(
        kinds(
          computeWeightAlerts(
            [weighIn('a', '2026-10-01', 4000), weighIn('b', '2026-10-12', 3000)],
            PUPPY,
          ),
        ),
      ).toEqual(['loss'])
    })

    it('only looks at the latest weigh-in', () => {
      expect(
        computeWeightAlerts(
          [
            weighIn('a', '2026-09-01', 4000),
            weighIn('b', '2026-09-10', 3000),
            weighIn('c', '2026-10-12', 3050),
          ],
          PUPPY,
        ),
      ).toEqual([])
    })

    it('has no time limit on the previous weigh-in', () => {
      expect(
        kinds(
          computeWeightAlerts(
            [weighIn('a', '2024-01-01', 4000), weighIn('b', '2026-10-12', 3000)],
            ADULT,
          ),
        ),
      ).toEqual(['loss'])
    })
  })

  describe('gain', () => {
    it('alerts an adult at exactly 10 %', () => {
      const alerts = computeWeightAlerts(
        [weighIn('a', '2026-10-01', 4000), weighIn('b', '2026-10-12', 4400)],
        ADULT,
      )

      expect(alerts).toEqual([{ kind: 'gain', percent: 10, since: '2026-10-01' }])
    })

    it('does not alert just under 10 %', () => {
      expect(
        computeWeightAlerts(
          [weighIn('a', '2026-10-01', 4000), weighIn('b', '2026-10-12', 4399)],
          ADULT,
        ),
      ).toEqual([])
    })

    it('does not alert for a puppy gaining weight', () => {
      expect(
        computeWeightAlerts(
          [weighIn('a', '2026-10-01', 2000), weighIn('b', '2026-10-12', 3000)],
          PUPPY,
        ),
      ).toEqual([])
    })

    it('takes the age at the date of the weigh-in', () => {
      const entries = (date: string) => [weighIn('a', '2026-10-01', 2000), weighIn('b', date, 3000)]

      expect(computeWeightAlerts(entries('2026-10-20'), '2025-10-21')).toEqual([])
      expect(kinds(computeWeightAlerts(entries('2026-10-21'), '2025-10-21'))).toEqual(['gain'])
    })

    it('compares with the oldest weigh-in of the window', () => {
      const alerts = computeWeightAlerts(
        [
          weighIn('a', '2026-09-01', 9000),
          weighIn('b', '2026-10-01', 4000),
          weighIn('c', '2026-10-20', 4300),
          weighIn('d', '2026-10-31', 4400),
        ],
        ADULT,
      )

      expect(alerts).toEqual([{ kind: 'gain', percent: 10, since: '2026-10-01' }])
    })

    it('includes the first day of the window and excludes the day before', () => {
      const entries = (date: string) => [
        weighIn('a', date, 4000),
        weighIn('b', '2026-10-31', 4400),
      ]

      expect(kinds(computeWeightAlerts(entries('2026-10-01'), ADULT))).toEqual(['gain'])
      expect(computeWeightAlerts(entries('2026-09-30'), ADULT)).toEqual([])
    })

    it('needs a weigh-in in the window', () => {
      expect(
        computeWeightAlerts(
          [weighIn('a', '2026-01-01', 4000), weighIn('b', '2026-10-12', 8000)],
          ADULT,
        ),
      ).toEqual([])
    })

    it('needs a birth date', () => {
      expect(
        computeWeightAlerts(
          [weighIn('a', '2026-10-01', 4000), weighIn('b', '2026-10-12', 8000)],
          undefined,
        ),
      ).toEqual([])
    })
  })

  describe('weigh-ins of the same day', () => {
    it('gives nothing when all the weigh-ins are from the same day', () => {
      expect(
        computeWeightAlerts(
          [weighIn('a', '2026-10-12', 4000), weighIn('b', '2026-10-12', 3000)],
          ADULT,
        ),
      ).toEqual([])
      expect(
        computeWeightAlerts(
          [weighIn('a', '2026-10-12', 3000), weighIn('b', '2026-10-12', 4000)],
          ADULT,
        ),
      ).toEqual([])
    })

    it('compares a loss with the latest earlier date, not the same day', () => {
      const alerts = computeWeightAlerts(
        [
          weighIn('a', '2026-10-10', 4000),
          weighIn('b', '2026-10-12', 3000),
          weighIn('c', '2026-10-12', 3900),
        ],
        ADULT,
      )

      expect(alerts).toEqual([])
    })

    it('reports a loss from the earlier date even when the same day looks stable', () => {
      const alerts = computeWeightAlerts(
        [
          weighIn('a', '2026-10-10', 4000),
          weighIn('b', '2026-10-12', 3700),
          weighIn('c', '2026-10-12', 3700),
        ],
        ADULT,
      )

      expect(alerts).toEqual([{ kind: 'loss', percent: -7.5, since: '2026-10-10' }])
    })

    it('does not take a same day weigh-in as the reference of a gain', () => {
      expect(
        computeWeightAlerts(
          [
            weighIn('a', '2026-10-01', 4000),
            weighIn('b', '2026-10-12', 3000),
            weighIn('c', '2026-10-12', 4100),
          ],
          ADULT,
        ),
      ).toEqual([])
    })

    it('takes the first weigh-in of the oldest day of the window', () => {
      const alerts = computeWeightAlerts(
        [
          weighIn('a', '2026-10-01', 4000),
          weighIn('b', '2026-10-01', 4400),
          weighIn('c', '2026-10-12', 4400),
        ],
        ADULT,
      )

      expect(alerts).toEqual([{ kind: 'gain', percent: 10, since: '2026-10-01' }])
    })
  })

  it('reports a loss and a gain together', () => {
    const alerts = computeWeightAlerts(
      [
        weighIn('a', '2026-10-01', 4000),
        weighIn('b', '2026-10-10', 5000),
        weighIn('c', '2026-10-20', 4700),
      ],
      ADULT,
    )

    expect(kinds(alerts)).toEqual(['loss', 'gain'])
  })
})

describe('formatWeightAlert', () => {
  it('states the figures, in French', () => {
    expect(
      formatWeightAlert({ kind: 'loss', percent: -6.2, since: '2026-10-12' }).replace(/\s/g, ' '),
    ).toBe('-6,2 % depuis le 12/10')
  })
})
