/** "12.5", "12,5", "-3", "6e3" as a number; null for anything else. Commas work as decimal points. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, '')
  const normal = s.includes('.') ? s.replace(/,/g, '') : s.replace(',', '.')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(normal)) return null
  const n = Number(normal)
  return Number.isFinite(n) ? n : null
}
