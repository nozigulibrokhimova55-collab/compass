import type { Confidence } from '../../lib/sampleData'

export const CONFIDENCE_OPTIONS: { id: Confidence; label: string; icon: string }[] = [
  { id: 'sure', label: 'Sure', icon: 'sentiment_satisfied' },
  { id: 'not_sure', label: 'Not sure', icon: 'sentiment_neutral' },
  { id: 'guessed', label: 'Guessed', icon: 'casino' },
]
export const CONFIDENCE_LABEL: Record<Confidence, string> = { sure: 'You were sure', not_sure: 'You weren’t sure', guessed: 'You guessed' }
