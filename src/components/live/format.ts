export const LETTERS = ['A', 'B', 'C', 'D']

/** "9.8 m/s²", with "give or take 0.1" when the question has a tolerance. */
export function numberAnswerText(answer: number | null, unit: string | null, tolerance: number | null) {
  if (answer === null) return ''
  const base = `${answer}${unit ? ` ${unit}` : ''}`
  return tolerance === null ? base : `${base} (give or take ${tolerance})`
}
