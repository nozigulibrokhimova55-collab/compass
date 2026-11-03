import { useState } from 'react'

/** Today's date, read once when the page opens, so every render agrees on what "today" is. */
export function useToday() {
  const [now] = useState(() => new Date())
  return now
}
