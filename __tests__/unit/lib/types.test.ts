import { computeOverall, QualityScores } from '@/lib/types'

describe('computeOverall', () => {
  it('returns 0 when all scores are 0', () => {
    const scores: QualityScores = {
      hook: 0, brand_fit: 0, audience: 0,
      message: 0, format_fit: 0, production: 0,
    }
    expect(computeOverall(scores)).toBe(0)
  })

  it('returns 10 when all scores are 10', () => {
    const scores: QualityScores = {
      hook: 10, brand_fit: 10, audience: 10,
      message: 10, format_fit: 10, production: 10,
    }
    expect(computeOverall(scores)).toBe(10)
  })

  it('result is between 0 and 10 for any valid input', () => {
    const scores: QualityScores = {
      hook: 7, brand_fit: 8, audience: 6,
      message: 7, format_fit: 8, production: 9,
    }
    const result = computeOverall(scores)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(10)
  })

  it('rounds to one decimal place', () => {
    const scores: QualityScores = {
      hook: 7, brand_fit: 8, audience: 6,
      message: 7, format_fit: 8, production: 9,
    }
    const result = computeOverall(scores)
    expect(result).toBe(Math.round(result * 10) / 10)
  })
})
