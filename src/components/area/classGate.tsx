import { EmptyState } from '../ui/EmptyState'
import { PageNotice } from '../ui/PageNotice'
import { useClassData } from '../../lib/classData'
import { Loading } from './AreaBits'

/**
 * The class has to load before a teacher page can show anything. Returns a loading, error or
 * "no class" screen, or null when the page can go ahead.
 */
export function useClassGate(extra?: { loading?: boolean; error?: string | null }) {
  const { loading, error, cls } = useClassData()
  if (loading || extra?.loading) return <Loading />
  if (error || extra?.error) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load your class" alert>
        {error ?? extra?.error} Check your connection, then reload the page.
      </PageNotice>
    )
  }
  if (!cls) {
    return (
      <EmptyState
        label="class.frame"
        icon="school"
        title="We can’t find your class"
        className="mt-10 max-w-xl"
        action={{ label: 'Reload', icon: 'refresh', onClick: () => window.location.reload() }}
      >
        Your class is made when you sign up. If you just signed up, give it a moment and reload.
      </EmptyState>
    )
  }
  return null
}

/** "1 student", "3 students". */
export function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`
}
