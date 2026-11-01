import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMonthBounds, todayISO } from '../../lib/dates'

describe('datas locais', () => {
  afterEach(() => vi.useRealTimers())

  it('todayISO usa o dia local, não o UTC (22h30 no Brasil ainda é o mesmo dia)', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 1, 22, 30))
    expect(todayISO()).toBe('2026-11-01')
  })

  it('todayISO no último dia do mês à noite não cai no mês seguinte', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 6, 31, 23, 59))
    expect(todayISO()).toBe('2026-07-31')
  })

  it('getMonthBounds devolve o primeiro e o último dia do mês', () => {
    expect(getMonthBounds(new Date(2026, 1, 10))).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' })
  })
})
