/** "Alex.Kim@school.edu" becomes "Alex Kim". */
export function nameFromEmail(email: string) {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ')
}

/** "Ms. Park" becomes "MP". One-word names (like Korean names) use their first two characters. */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase()
  return (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toUpperCase()
}
